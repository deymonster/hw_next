#!/usr/bin/env bash
set -euo pipefail

# Требуются root-права
if [[ $EUID -ne 0 ]]; then
  echo "⚠️  Этот скрипт требует root-доступа. Запустите через: sudo ./cleanup.sh"
  exit 1
fi

# Настройки по умолчанию
INSTALL_DIR="${INSTALL_DIR:-/opt/hw-monitor}"
COMPOSE_FILE="${COMPOSE_FILE:-$INSTALL_DIR/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$INSTALL_DIR/.env.prod}"

FORCE=false
REMOVE_IMAGES=false
PRUNE_DOCKER=false

usage() {
  cat <<'USAGE'
Использование: cleanup.sh [опции]
  --force             Выполнить без подтверждений
  --remove-images     Удалить докер-образы (по списку)
  --prune-docker      Выполнить docker system prune -a --volumes
  --install-dir PATH  Путь установки (по умолчанию /opt/hw-monitor)
USAGE
}

# Парсинг аргументов
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=true; shift ;;
    --remove-images) REMOVE_IMAGES=true; shift ;;
    --prune-docker) PRUNE_DOCKER=true; shift ;;
    --install-dir)
      INSTALL_DIR="$2"
      COMPOSE_FILE="$INSTALL_DIR/docker-compose.prod.yml"
      ENV_FILE="$INSTALL_DIR/.env.prod"
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Неизвестная опция: $1"; usage; exit 1 ;;
  esac
done

confirm() {
  local prompt="$1"
  if $FORCE; then
    return 0
  fi
  read -r -p "$prompt [y/N]: " ans
  ans="${ans,,}"
  [[ "$ans" == "y" || "$ans" == "yes" ]]
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif docker-compose version >/dev/null 2>&1; then
    echo "docker-compose"
  else
    echo ""
  fi
}

echo "🚨 Предупреждение: будут удалены БД, данные Redis и все файлы установки."
echo "Путь установки: $INSTALL_DIR"
if ! confirm "Продолжить очистку?"; then
  echo "Отменено."
  exit 0
fi

DC="$(detect_compose)"
if [[ -n "$DC" && -f "$COMPOSE_FILE" ]]; then
  echo "▶ Останавливаю стек через Compose: $COMPOSE_FILE"
  $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down -v || true
else
  echo "ℹ️  Compose не найден или отсутствует файл $COMPOSE_FILE — пропускаю down -v."
fi

# Удаление контейнеров по именам
containers=(
  nextjs_app
  db-migrate
  postgres_container
  prometheus_container
  alertmanager_container
  nginx_combined
  redis_container
  licd
  prometheus_config_init
)
for c in "${containers[@]}"; do
  if docker ps -a --format '{{.Names}}' | grep -Fxq "$c"; then
    echo "🧹 Удаляю контейнер: $c"
    docker rm -f "$c" || true
  fi
done

# Удаление сети
networks=(hw-network)
for n in "${networks[@]}"; do
  if docker network ls --format '{{.Name}}' | grep -Fxq "$n"; then
    echo "🧹 Удаляю сеть: $n"
    docker network rm "$n" || true
  fi
done

# Удаление томов
volumes=(
  pg_data
  redis_data
  prom-data
  prom-configs
  uploads
  nextjs_prometheus_config
  licd_data
)
for v in "${volumes[@]}"; do
  if docker volume ls --format '{{.Name}}' | grep -Fxq "$v"; then
    echo "🧹 Удаляю том: $v"
    docker volume rm "$v" || true
  fi
done

# Опционально удаление образов
if $REMOVE_IMAGES; then
  echo "🧹 Удаляю образы (если присутствуют)..."
  images=(
    deymonster/hw-monitor
    deymonster/hw-monitor-nginx-combined
    deymonster/hw-monitor-licd
    prom/prometheus
    prom/alertmanager
    redis
    postgres
  )
  for i in "${images[@]}"; do
    docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' \
      | awk -v repo="$i" '$1 ~ "^"repo":" { print $2 }' \
      | xargs -r docker rmi -f || true
  done
fi

# Полная очистка Docker (опционально)
if $PRUNE_DOCKER; then
  echo "🧨 Выполняю docker system prune -a --volumes ..."
  docker system prune -a --volumes -f || true
fi

# Удаление файлов и симлинка
echo "🗑️  Удаляю директорию установки: $INSTALL_DIR"
rm -rf "$INSTALL_DIR" || true

echo "🗑️  Удаляю symlink /usr/local/bin/hwctl (если есть)"
rm -f /usr/local/bin/hwctl || true

echo "✅ Очистка завершена."