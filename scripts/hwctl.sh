#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/hw-monitor}"
ENV_FILE="${ENV_FILE:-$INSTALL_DIR/.env.prod}"
COMPOSE_FILE="${COMPOSE_FILE:-$INSTALL_DIR/docker-compose.prod.yml}"
COMPOSE_FILE_URL="${COMPOSE_FILE_URL:-https://storage.deymonster.ru/s/pwK2PLo5DDyspnm/download/docker-compose.prod.yml}"
PROJECT_NAME="${PROJECT_NAME:-hw-monitor}"

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif docker-compose version >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "❌ Docker Compose не найден."
  exit 1
fi

get_project_images() {
  # Берём только ваши сервисы, чтобы случайно не обновлять БД/Redis
  grep -E '^[[:space:]]*image:[[:space:]]*deymonster/hw-monitor' "$COMPOSE_FILE" | awk -F'image:' '{print $2}' | tr -d ' '
}

set_latest_images() {
  local tmp; tmp="$(mktemp)"
  cp "$COMPOSE_FILE" "$tmp"
  # Меняем теги ваших образов на :latest
  sed -E -i 's|(^[[:space:]]*image:[[:space:]]*deymonster/hw-monitor[-a-z]+):[A-Za-z0-9._-]+|\1:latest|g' "$tmp"
  mv "$tmp" "$COMPOSE_FILE"
  echo "✅ Теги образов проекта переключены на :latest в $COMPOSE_FILE"
}

refresh_compose_from_remote() {
  local url="${COMPOSE_FILE_URL:-}"
  if [[ -n "$url" ]]; then
    curl -fsSL "$url" -o "$COMPOSE_FILE"
    echo "✅ Обновлён compose-файл: $COMPOSE_FILE из $url"
  else
    echo "⚠️ COMPOSE_FILE_URL не задан — пропускаю обновление compose-файла."
  fi
}

check_updates() {
  local images any=0
  images="$(get_project_images || true)"
  [[ -z "$images" ]] && { echo "⚠️ Не найдено образов проекта в $COMPOSE_FILE"; exit 0; }
  while read -r img; do
    [[ -z "$img" ]] && continue
    out="$(docker pull "$img" 2>&1 || true)"
    if echo "$out" | grep -qi 'Downloaded newer image'; then
      echo "⬆️ Доступно обновление: $img"
      any=1
    else
      echo "✓ Актуально: $img"
    fi
  done <<< "$images"
  if [[ "$any" == "1" ]]; then
    exit 10
  else
    exit 0
  fi
}

remove_service() {
  local service="${1:-}"
  [[ -z "$service" ]] && { echo "Укажите сервис: hwctl remove <service>"; exit 2; }
  sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" rm -f -s -v "$service"
  echo "✅ Удалён сервис: $service"
}


purge_project() {
  sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down -v --remove-orphans
  if [[ "${REMOVE_IMAGES:-0}" == "1" ]]; then
    docker image ls 'deymonster/hw-monitor*' -q | xargs -r docker rmi -f
  fi
  if [[ "${REMOVE_HWCTL:-0}" == "1" ]]; then
    sudo rm -f /usr/local/bin/hwctl
    rm -f "${INSTALL_DIR%/}/hwctl.sh"
    echo "🗑️ Удалён hwctl (скрипт и симлинк)."
  fi
  echo "✅ Проект ${PROJECT_NAME} очищен."
}

run_cleanup_script() {
  local cleanup="${INSTALL_DIR%/}/scripts/cleanup.sh"
  if [[ -x "$cleanup" ]]; then
    bash "$cleanup"
  else
    echo "⚠️ cleanup.sh не найден или не исполняемый: $cleanup"
  fi
}

update_stack() {
  if [[ "$DC" == "docker compose" ]]; then
    sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --pull always --remove-orphans
  else
    sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
    sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans
  fi
  echo "✅ Стек обновлён."
}

# Функция: print_help()
print_help() {
  cat <<'EOF'
hwctl — утилита управления HW Monitor

Использование:
  hwctl <команда> [опции]

Команды:
  up         — поднять стек (docker compose up -d)
  restart    — перезапустить контейнеры
  stop       — остановить контейнеры
  down       — остановить и удалить контейнеры
  logs       — поток логов (эквивалент docker compose logs -f)
  ps         — статус контейнеров
  pull       — вручную подтянуть образы
  update     — обновить стек с автопулом образов
               - Compose v2: up -d --pull always --remove-orphans
               - Compose v1: pull -> up -d --remove-orphans
  purge      — полная очистка проекта (down -v --remove-orphans)
               Доп. флаги:
                 --remove-images  удалить образы deymonster/hw-monitor*
                 --remove-hwctl   удалить скрипт и симлинк hwctl

Переменные окружения:
  INSTALL_DIR  каталог установки (по умолчанию /opt/hw-monitor)
  ENV_FILE     путь к .env (по умолчанию $INSTALL_DIR/.env.prod)
  COMPOSE_FILE путь к docker-compose.prod.yml (по умолчанию $INSTALL_DIR/docker-compose.prod.yml)

Примеры:
  hwctl update
  hwctl purge --remove-images
  hwctl ps
  hwctl logs
  hwctl restart

EOF
}

# Удаляем команду remove из свитча и добавляем help
action="${1:-}"
case "$action" in
  up)      sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d ;;
  restart) sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" restart ;;
  stop)    sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stop ;;
  down)    sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down ;;
  logs)    sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs -f ;;
  ps)      sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps ;;
  pull)    sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull ;;
  update)  update_stack ;;
  help|-h|--help) print_help; exit 0 ;;
  purge)
    shift || true
    REMOVE_IMAGES=0; REMOVE_HWCTL=0
    while [[ "${1:-}" =~ ^-- ]]; do
      case "$1" in
        --remove-images) REMOVE_IMAGES=1; shift ;;
        --remove-hwctl)  REMOVE_HWCTL=1; shift ;;
        *) echo "Неизвестный флаг: $1"; exit 2 ;;
      esac
    done
    purge_project
    ;;
  *)
    print_help
    exit 1
    ;;
esac