#!/usr/bin/env bash
set -Eeuo pipefail

# ===========================
# Installer v2.1 (Astra-aware)
# ===========================

INSTALL_DIR="${INSTALL_DIR:-/opt/hw-monitor}"
COMPOSE_URL="${COMPOSE_URL:-}"
COMPOSE_FILE_URL="${COMPOSE_FILE_URL:-https://github.com/deymonster/hw_next/raw/refs/heads/main/docker-compose.prod.yml}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"
PROJECT_NAME="${PROJECT_NAME:-hw-monitor}"
NON_INTERACTIVE="${NON_INTERACTIVE:-0}"

NEXT_TAG="${NEXT_TAG:-}"
NGINX_TAG="${NGINX_TAG:-}"
LICD_TAG="${LICD_TAG:-}"

BASIC_AUTH_USER="${BASIC_AUTH_USER:-}"
BASIC_AUTH_PASS="${BASIC_AUTH_PASS:-}"

NGINX_AUTH_FILE=""
set_nginx_auth_file() {
  NGINX_AUTH_FILE="${INSTALL_DIR%/}/nginx/auth/.htpasswd"
}

log() { printf "\033[1;32m[+] %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m[!] %s\033[0m\n" "$*"; }
err() { printf "\033[1;31m[×] %s\033[0m\n" "$*" >&2; }
die() { err "$*"; exit 1; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || die "Команда '$1' не найдена. Установите её и повторите."; }

detect_os() {
  OS_ID=""; OS_NAME=""; OS_VERSION=""; OS_CODENAME=""; OS_ID_LIKE=""
  if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS_ID="${ID:-}"
    OS_NAME="${NAME:-}"
    OS_VERSION="${VERSION_ID:-}"
    OS_CODENAME="${VERSION_CODENAME:-}"
    OS_ID_LIKE="${ID_LIKE:-}"
  fi
  echo "$OS_ID|$OS_NAME|$OS_VERSION|$OS_CODENAME|$OS_ID_LIKE"
}

prompt_if_empty() {
  local var_name="$1"; local prompt="$2"; local default="${3:-}"
  local current="${!var_name:-}"
  if [[ "$NON_INTERACTIVE" = "1" ]]; then
    [[ -n "$current" ]] || die "Отсутствует обязательное значение для $var_name в режиме NON_INTERACTIVE."
    return 0
  fi
  if [[ -z "$current" ]]; then
    read -rp "$prompt${default:+ [$default]}: " value
    value="${value:-$default}"
    printf -v "$var_name" "%s" "$value"; export "$var_name"
  fi
}

ensure_docker_common() {
  if ! command -v docker >/dev/null 2>&1; then
    warn "Docker не найден — устанавливаю через apt."
    require_cmd apt-get
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    CODENAME="$(. /etc/os-release; echo "${VERSION_CODENAME:-bullseye}")"
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") ${CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
  if ! docker compose version >/dev/null 2>&1; then
    warn "Плагин Docker Compose не найден — устанавливаю."
    sudo apt-get install -y docker-compose-plugin || return 1
  fi
  return 0
}

# Astra Linux: ensure network repositories (disable cdrom, add official Astra repos)
ensure_astra_repos() {
  warn "Настраиваю репозитории Astra Linux (отключаю cdrom, включаю сетевые)."
  for f in /etc/apt/sources.list /etc/apt/sources.list.d/*.list; do
    [[ -f "$f" ]] && sudo sed -i 's/^\s*deb\s\+cdrom:/# &/g' "$f" || true
  done
  sudo mkdir -p /etc/apt/sources.list.d
  sudo tee /etc/apt/sources.list.d/astra.list >/dev/null <<'EOF'
deb https://dl.astralinux.ru/astra/stable/1.7_x86-64/repository-main/ 1.7_x86-64 main contrib non-free
deb https://dl.astralinux.ru/astra/stable/1.7_x86-64/repository-update/ 1.7_x86-64 main contrib non-free
deb https://dl.astralinux.ru/astra/stable/1.7_x86-64/repository-base/ 1.7_x86-64 main contrib non-free
deb https://dl.astralinux.ru/astra/stable/1.7_x86-64/repository-extended/ 1.7_x86-64 main contrib non-free
deb https://dl.astralinux.ru/astra/stable/1.7_x86-64/repository-extended/ 1.7_x86-64 astra-ce
EOF
  sudo apt-get update -y || true
  sudo apt-get install -y apt-transport-https ca-certificates || true
  sudo apt-get update -y || true
  log "Репозитории Astra настроены."
}

ensure_docker_astra() {
  require_cmd apt-get
  ensure_astra_repos
  sudo apt-get update -y || true

  if ! command -v docker >/dev/null 2>&1; then
    warn "Пробую установить 'docker.io' из репозиториев Astra."
    if ! sudo apt-get install -y docker.io; then
      warn "Пакет docker.io недоступен; добавляю официальный репозиторий Docker для Debian (bullseye) как фолбэк."
      sudo apt-get install -y ca-certificates curl gnupg
      sudo install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bullseye stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
      sudo apt-get update -y
      sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin || die "Не удалось установить Docker из официального репозитория."
    fi
  fi

  if ! docker compose version >/dev/null 2>&1; then
    warn "Пробую установить плагин docker compose."
    if ! sudo apt-get install -y docker-compose-plugin; then
      warn "Плагин Compose недоступен; устанавливаю устаревший docker-compose как фолбэк."
      if command -v curl >/dev/null 2>&1; then
        sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.7/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
      else
        die "Ни плагин Compose, ни curl недоступны для установки — завершение."
      fi
    fi
  fi
}

ensure_docker() {
  IFS='|' read -r OS_ID OS_NAME OS_VERSION OS_CODENAME OS_ID_LIKE < <(detect_os)
  log "Обнаружена ОС: id='${OS_ID}' имя='${OS_NAME}' версия='${OS_VERSION}' кодовое имя='${OS_CODENAME}' like='${OS_ID_LIKE}'"
  if [[ "$OS_ID" == "astra" || "$OS_NAME" == *"Astra Linux"* ]]; then
    log "Применяю установку Docker для Astra Linux"
    ensure_docker_astra
  elif [[ "$OS_ID_LIKE" == *"debian"* || "$OS_ID" == "debian" || "$OS_ID" == "ubuntu" ]]; then
    ensure_docker_common
  else
    die "Дистрибутив не поддерживается для автоустановки. Установите Docker и Compose вручную."
  fi
}

prepare_dirs() {
  set_nginx_auth_file
  mkdir -p "${INSTALL_DIR%/}/nginx/auth" "${INSTALL_DIR%/}/data" "${INSTALL_DIR%/}/logs"
}

fetch_compose_if_needed() {
  if [[ -n "$COMPOSE_URL" ]]; then
    log "Скачиваю compose-файл из $COMPOSE_URL"
    curl -fsSL "$COMPOSE_URL" -o "${INSTALL_DIR%/}/${COMPOSE_FILE}"
  else
    if [[ -f "$COMPOSE_FILE" ]]; then
      cp "$COMPOSE_FILE" "${INSTALL_DIR%/}/${COMPOSE_FILE}"
    elif [[ -f "docker-compose.yml" ]]; then
      warn "Найден локальный docker-compose.yml; использую его как ${COMPOSE_FILE}"
      cp "docker-compose.yml" "${INSTALL_DIR%/}/${COMPOSE_FILE}"
    elif [[ -n "$COMPOSE_FILE_URL" ]]; then
      log "Скачиваю compose-файл по COMPOSE_FILE_URL=$COMPOSE_FILE_URL"
      curl -fsSL "$COMPOSE_FILE_URL" -o "${INSTALL_DIR%/}/${COMPOSE_FILE}"
    elif [[ -f "/mnt/data/${COMPOSE_FILE}" ]]; then
      cp "/mnt/data/${COMPOSE_FILE}" "${INSTALL_DIR%/}/${COMPOSE_FILE}"
    else
      die "Compose-файл не найден локально и URL не указан."
    fi
  fi
}

ensure_env_file() {
  local env_path="${INSTALL_DIR%/}/${ENV_FILE}"
  mkdir -p "$(dirname "$env_path")"

  # Detect server IP/domain
  local server_ip="${NEXT_PUBLIC_SERVER_IP:-$(get_env NEXT_PUBLIC_SERVER_IP)}"
  [[ -z "$server_ip" ]] && server_ip="$(detect_ip)"

  # Base URLs
  local NEXT_PUBLIC_BASE_URL="${NEXT_PUBLIC_BASE_URL:-$(get_env NEXT_PUBLIC_BASE_URL)}"
  [[ -z "$NEXT_PUBLIC_BASE_URL" ]] && NEXT_PUBLIC_BASE_URL="http://${server_ip}:3000"
  local NEXT_PUBLIC_URL="${NEXT_PUBLIC_URL:-$(get_env NEXT_PUBLIC_URL)}"
  [[ -z "$NEXT_PUBLIC_URL" ]] && NEXT_PUBLIC_URL="$NEXT_PUBLIC_BASE_URL"
  local NEXTAUTH_URL="${NEXTAUTH_URL:-$(get_env NEXTAUTH_URL)}"
  [[ -z "$NEXTAUTH_URL" ]] && NEXTAUTH_URL="$NEXT_PUBLIC_BASE_URL"
  local NEXT_PUBLIC_STORAGE_URL="${NEXT_PUBLIC_STORAGE_URL:-$(get_env NEXT_PUBLIC_STORAGE_URL)}"
  [[ -z "$NEXT_PUBLIC_STORAGE_URL" ]] && NEXT_PUBLIC_STORAGE_URL="http://${server_ip}:8081"
  local NEXT_PUBLIC_UPLOADS_BASE_URL="${NEXT_PUBLIC_UPLOADS_BASE_URL:-$(get_env NEXT_PUBLIC_UPLOADS_BASE_URL)}"
  [[ -z "$NEXT_PUBLIC_UPLOADS_BASE_URL" ]] && NEXT_PUBLIC_UPLOADS_BASE_URL="${NEXT_PUBLIC_STORAGE_URL}/uploads"

  # PostgreSQL
  local POSTGRES_USER="${POSTGRES_USER:-$(get_env POSTGRES_USER)}"; [[ -z "$POSTGRES_USER" ]] && POSTGRES_USER="postgres"
  local POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(get_env POSTGRES_PASSWORD)}"; [[ -z "$POSTGRES_PASSWORD" ]] && POSTGRES_PASSWORD="$(random_string)"
  local POSTGRES_DB="${POSTGRES_DB:-$(get_env POSTGRES_DB)}"; [[ -z "$POSTGRES_DB" ]] && POSTGRES_DB="hw_monitor"
  local POSTGRES_HOST="${POSTGRES_HOST:-$(get_env POSTGRES_HOST)}"; [[ -z "$POSTGRES_HOST" ]] && POSTGRES_HOST="postgres"
  local POSTGRES_PORT="${POSTGRES_PORT:-$(get_env POSTGRES_PORT)}"; [[ -z "$POSTGRES_PORT" ]] && POSTGRES_PORT="5432"
  local DATABASE_URL="${DATABASE_URL:-$(get_env DATABASE_URL)}"
  [[ -z "$DATABASE_URL" ]] && DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"

  # Redis
  local REDIS_PASSWORD="${REDIS_PASSWORD:-$(get_env REDIS_PASSWORD)}"; [[ -z "$REDIS_PASSWORD" ]] && REDIS_PASSWORD="$(random_string)"
  local REDIS_HOST="${REDIS_HOST:-$(get_env REDIS_HOST)}"; [[ -z "$REDIS_HOST" ]] && REDIS_HOST="redis"
  local REDIS_PORT="${REDIS_PORT:-$(get_env REDIS_PORT)}"; [[ -z "$REDIS_PORT" ]] && REDIS_PORT="6379"
  local REDIS_URL="${REDIS_URL:-$(get_env REDIS_URL)}"
  [[ -z "$REDIS_URL" ]] && REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"

  # Prometheus / Node Exporter
  local PROMETHEUS_PORT="${PROMETHEUS_PORT:-$(get_env PROMETHEUS_PORT)}"; [[ -z "$PROMETHEUS_PORT" ]] && PROMETHEUS_PORT="9090"
  local PROMETHEUS_INTERNAL_URL="${PROMETHEUS_INTERNAL_URL:-$(get_env PROMETHEUS_INTERNAL_URL)}"; [[ -z "$PROMETHEUS_INTERNAL_URL" ]] && PROMETHEUS_INTERNAL_URL="http://prometheus:9090"
  local PROMETHEUS_PROXY_URL="${PROMETHEUS_PROXY_URL:-$(get_env PROMETHEUS_PROXY_URL)}"; [[ -z "$PROMETHEUS_PROXY_URL" ]] && PROMETHEUS_PROXY_URL="http://nginx-proxy:8080"
  local PROMETHEUS_USE_SSL="${PROMETHEUS_USE_SSL:-$(get_env PROMETHEUS_USE_SSL)}"; [[ -z "$PROMETHEUS_USE_SSL" ]] && PROMETHEUS_USE_SSL="False"
  local PROMETHEUS_TARGETS_PATH="${PROMETHEUS_TARGETS_PATH:-$(get_env PROMETHEUS_TARGETS_PATH)}"; [[ -z "$PROMETHEUS_TARGETS_PATH" ]] && PROMETHEUS_TARGETS_PATH="./prometheus/targets/windows_targets.json"
  local PROMETHEUS_USERNAME="${PROMETHEUS_USERNAME:-$(get_env PROMETHEUS_USERNAME)}"; [[ -z "$PROMETHEUS_USERNAME" ]] && PROMETHEUS_USERNAME="${BASIC_AUTH_USER:-admin}"
  local PROMETHEUS_AUTH_PASSWORD="${PROMETHEUS_AUTH_PASSWORD:-$(get_env PROMETHEUS_AUTH_PASSWORD)}"; [[ -z "$PROMETHEUS_AUTH_PASSWORD" ]] && PROMETHEUS_AUTH_PASSWORD="${BASIC_AUTH_PASS:-admin}"
  local NODE_EXPORTER_PORT="${NODE_EXPORTER_PORT:-$(get_env NODE_EXPORTER_PORT)}"; [[ -z "$NODE_EXPORTER_PORT" ]] && NODE_EXPORTER_PORT="9100"

  # LICD
  local LICD_URL="${LICD_URL:-$(get_env LICD_URL)}"; [[ -z "$LICD_URL" ]] && LICD_URL="http://licd:8081"

  # Windows agents handshake
  local AGENT_HANDSHAKE_KEY="${AGENT_HANDSHAKE_KEY:-$(get_env AGENT_HANDSHAKE_KEY)}"; [[ -z "$AGENT_HANDSHAKE_KEY" ]] && AGENT_HANDSHAKE_KEY="VERY_SECRET_KEY"
  local HANDSHAKE_KEY="${HANDSHAKE_KEY:-$(get_env HANDSHAKE_KEY)}"; [[ -z "$HANDSHAKE_KEY" ]] && HANDSHAKE_KEY="$AGENT_HANDSHAKE_KEY"

  # Node/Admin
  local NODE_ENV="${NODE_ENV:-$(get_env NODE_ENV)}"; [[ -z "$NODE_ENV" ]] && NODE_ENV="production"
  local ADMIN_USERNAME="${ADMIN_USERNAME:-$(get_env ADMIN_USERNAME)}"; [[ -z "$ADMIN_USERNAME" ]] && ADMIN_USERNAME="admin"
  local ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(get_env ADMIN_PASSWORD)}"; [[ -z "$ADMIN_PASSWORD" ]] && ADMIN_PASSWORD="admin"

  # Telegram (optional)
  local TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-$(get_env TELEGRAM_BOT_TOKEN)}"
  local TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-$(get_env TELEGRAM_CHAT_ID)}"
  local ADMIN_TELEGRAM_CHAT_ID="${ADMIN_TELEGRAM_CHAT_ID:-$(get_env ADMIN_TELEGRAM_CHAT_ID)}"

  # SMTP defaults (interactive if TTY)
  local SMTP_HOST="${SMTP_HOST:-$(get_env SMTP_HOST)}"; [[ -z "$SMTP_HOST" ]] && SMTP_HOST="smtp.example.com"
  local SMTP_PORT="${SMTP_PORT:-$(get_env SMTP_PORT)}"; [[ -z "$SMTP_PORT" ]] && SMTP_PORT="587"
  local SMTP_SECURE="${SMTP_SECURE:-$(get_env SMTP_SECURE)}"; [[ -z "$SMTP_SECURE" ]] && SMTP_SECURE="false"
  local SMTP_USER="${SMTP_USER:-$(get_env SMTP_USER)}"; [[ -z "$SMTP_USER" ]] && SMTP_USER="user"
  local SMTP_PASSWORD="${SMTP_PASSWORD:-$(get_env SMTP_PASSWORD)}"; [[ -z "$SMTP_PASSWORD" ]] && SMTP_PASSWORD="password"
  local SMTP_FROM_EMAIL="${SMTP_FROM_EMAIL:-$(get_env SMTP_FROM_EMAIL)}"; [[ -z "$SMTP_FROM_EMAIL" ]] && SMTP_FROM_EMAIL="noreply@example.com"
  local SMTP_FROM_NAME="${SMTP_FROM_NAME:-$(get_env SMTP_FROM_NAME)}"; [[ -z "$SMTP_FROM_NAME" ]] && SMTP_FROM_NAME="NITRINOnet Monitoring System"

  if [ -t 0 ] && [[ "$NON_INTERACTIVE" != "1" ]]; then
    read -rp "SMTP хост [${SMTP_HOST}]: " v; SMTP_HOST="${v:-$SMTP_HOST}"
    read -rp "SMTP порт [${SMTP_PORT}]: " v; SMTP_PORT="${v:-$SMTP_PORT}"
    read -rp "SMTP secure (true/false) [${SMTP_SECURE}]: " v; [[ -n "$v" ]] && SMTP_SECURE="${v}"
    read -rp "SMTP пользователь [${SMTP_USER}]: " v; SMTP_USER="${v:-$SMTP_USER}"
    read -rp "SMTP пароль [${SMTP_PASSWORD}]: " v; SMTP_PASSWORD="${v:-$SMTP_PASSWORD}"
    read -rp "Отправитель (email) [${SMTP_FROM_EMAIL}]: " v; SMTP_FROM_EMAIL="${v:-$SMTP_FROM_EMAIL}"
    read -rp "Отправитель (имя) [${SMTP_FROM_NAME}]: " v; SMTP_FROM_NAME="${v:-$SMTP_FROM_NAME}"
  fi

  # Secrets (безопасная инициализация при set -u)
  local NEXTAUTH_SECRET_FROM_FILE; NEXTAUTH_SECRET_FROM_FILE="$(get_env NEXTAUTH_SECRET)"
  local ENCRYPTION_KEY_FROM_FILE; ENCRYPTION_KEY_FROM_FILE="$(get_env ENCRYPTION_KEY)"
  local NEXTAUTH_SECRET="${NEXTAUTH_SECRET-}"
  local ENCRYPTION_KEY="${ENCRYPTION_KEY-}"
  [[ -z "$NEXTAUTH_SECRET" ]] && NEXTAUTH_SECRET="$NEXTAUTH_SECRET_FROM_FILE"
  [[ -z "$ENCRYPTION_KEY" ]] && ENCRYPTION_KEY="$ENCRYPTION_KEY_FROM_FILE"
  [[ -z "$NEXTAUTH_SECRET" ]] && NEXTAUTH_SECRET="$(random_hex64)"
  [[ -z "$ENCRYPTION_KEY" ]] && ENCRYPTION_KEY="$(random_hex64)"

  # Write env file
  tee "$env_path" >/dev/null <<EOF
# Сгенерировано установщиком v2.1
NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
NEXT_PUBLIC_SERVER_IP=${server_ip}
NEXT_PUBLIC_URL=${NEXT_PUBLIC_URL}
NEXTAUTH_URL=${NEXTAUTH_URL}
NEXT_PUBLIC_STORAGE_URL=${NEXT_PUBLIC_STORAGE_URL}
NEXT_PUBLIC_UPLOADS_BASE_URL=${NEXT_PUBLIC_UPLOADS_BASE_URL}

# PostgreSQL
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_HOST=${POSTGRES_HOST}
POSTGRES_PORT=${POSTGRES_PORT}
DATABASE_URL=${DATABASE_URL}

# Prometheus
PROMETHEUS_PORT=${PROMETHEUS_PORT}
PROMETHEUS_PROXY_URL=${PROMETHEUS_PROXY_URL}
PROMETHEUS_USE_SSL=${PROMETHEUS_USE_SSL}
PROMETHEUS_TARGETS_PATH=${PROMETHEUS_TARGETS_PATH}
PROMETHEUS_USERNAME=${PROMETHEUS_USERNAME}
PROMETHEUS_AUTH_PASSWORD=${PROMETHEUS_AUTH_PASSWORD}
PROMETHEUS_INTERNAL_URL=${PROMETHEUS_INTERNAL_URL}

# Node Exporter
NODE_EXPORTER_PORT=${NODE_EXPORTER_PORT}

# Telegram
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
ADMIN_TELEGRAM_CHAT_ID=${ADMIN_TELEGRAM_CHAT_ID}

# Admin
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}

# Windows agents
AGENT_HANDSHAKE_KEY=${AGENT_HANDSHAKE_KEY}
HANDSHAKE_KEY=${HANDSHAKE_KEY}

# Node
NODE_ENV=${NODE_ENV}

# SMTP
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_SECURE=${SMTP_SECURE}
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_FROM_EMAIL=${SMTP_FROM_EMAIL}
SMTP_FROM_NAME=${SMTP_FROM_NAME}

# Encryption
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_URL=${REDIS_URL}

# Auth
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
EOF

  # Also provide .env for compose files that reference env_file: .env
  cp "$env_path" "${INSTALL_DIR%/}/.env" 2>/dev/null || true
}

install_hwctl() {
    local src_dir
    src_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local hwctl_src="${src_dir%/}/hwctl.sh"
    local hwctl_dst="${INSTALL_DIR%/}/hwctl.sh"

    if [[ ! -f "$hwctl_src" ]]; then
        warn "Не найден исходный скрипт: $hwctl_src. Пропускаю установку hwctl."
        return 0
    fi

    mkdir -p "$INSTALL_DIR"
    cp "$hwctl_src" "$hwctl_dst"
    chmod +x "$hwctl_dst" || true

    if ln -sf "$hwctl_dst" /usr/local/bin/hwctl 2>/dev/null; then
        log "Создан симлинк /usr/local/bin/hwctl -> $hwctl_dst"
    else
        warn "Не удалось создать симлинк /usr/local/bin/hwctl. Используйте локальный скрипт: $hwctl_dst"
    fi

    log "Установлен локальный скрипт управления: $hwctl_dst"
}

generate_htpasswd_if_needed() {
  if [[ -d "$NGINX_AUTH_FILE" ]]; then
    rm -rf "$NGINX_AUTH_FILE"
  fi

  local user="${BASIC_AUTH_USER:-$(get_env PROMETHEUS_USERNAME)}"
  local pass="${BASIC_AUTH_PASS:-$(get_env PROMETHEUS_AUTH_PASSWORD)}"

  if [[ -n "$BASIC_AUTH_USER" && -n "$BASIC_AUTH_PASS" ]]; then
    require_cmd openssl
    local auth_dir; auth_dir="$(dirname "$NGINX_AUTH_FILE")"
    mkdir -p "$auth_dir"
    local hash; hash=$(openssl passwd -apr1 "$BASIC_AUTH_PASS")
    echo "${BASIC_AUTH_USER}:${hash}" > "$NGINX_AUTH_FILE"
    chmod 644 "$NGINX_AUTH_FILE"
    log "Создан файл базовой аутентификации: $NGINX_AUTH_FILE"
  else
    local auth_dir; auth_dir="$(dirname "$NGINX_AUTH_FILE")"
    mkdir -p "$auth_dir"
    if [[ ! -f "$NGINX_AUTH_FILE" ]]; then
      : > "$NGINX_AUTH_FILE"
      chmod 644 "$NGINX_AUTH_FILE"
      warn "BASIC_AUTH_USER/BASIC_AUTH_PASS не заданы; создал пустой файл $NGINX_AUTH_FILE. Nginx запустится, но Basic Auth не будет работать."
    else
      chmod 644 "$NGINX_AUTH_FILE"
      warn "BASIC_AUTH_USER/BASIC_AUTH_PASS не заданы; использую существующий $NGINX_AUTH_FILE."
    fi
  fi
}

patch_image_tags_if_requested() {
  local compose_path="${INSTALL_DIR%/}/${COMPOSE_FILE}"
  [[ -f "$compose_path" ]] || die "Compose file not found at $compose_path"

  local tmp; tmp="$(mktemp)"
  cp "$compose_path" "$tmp"

  local next_prefix="deymonster/hw-monitor-nextjs"
  local nginx_prefix="deymonster/hw-monitor-nginx-combined"
  local licd_prefix="deymonster/hw-monitor-licd"

  if [[ -n "$NEXT_TAG" ]]; then
    sed -E -i "s|(${next_prefix}):[A-Za-z0-9._-]+|\\1:${NEXT_TAG}|g" "$tmp"
  fi
  if [[ -n "$NGINX_TAG" ]]; then
    sed -E -i "s|(${nginx_prefix}):[A-Za-z0-9._-]+|\\1:${NGINX_TAG}|g" "$tmp"
  fi
  if [[ -n "$LICD_TAG" ]]; then
    sed -E -i "s|(${licd_prefix}):[A-Za-z0-9._-]+|\\1:${LICD_TAG}|g" "$tmp"
  fi

  mv "$tmp" "$compose_path"
}

bring_up_stack() {
  local env_path="${INSTALL_DIR%/}/${ENV_FILE}"
  local compose_path="${INSTALL_DIR%/}/${COMPOSE_FILE}"
  if docker compose version >/dev/null 2>&1; then
    ( cd "$INSTALL_DIR" && docker compose --project-name "$PROJECT_NAME" --env-file "$env_path" -f "$compose_path" up -d )
  elif command -v docker-compose >/dev/null 2>&1; then
    warn "Обнаружен docker-compose v1 (legacy). Продолжаю с ним; рекомендуется установить plugin v2 и использовать 'docker compose'."
    ( cd "$INSTALL_DIR" && docker-compose --project-name "$PROJECT_NAME" --env-file "$env_path" -f "$compose_path" up -d )
  else
    die "Не найдено ни 'docker compose', ни 'docker-compose'."
  fi
  log "Стек запущен. Проект: $PROJECT_NAME"
}

# Helper: detect server IP
detect_ip() {
  local ip
  ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
  [[ -z "$ip" ]] && ip=$(curl -s http://ifconfig.me || echo "127.0.0.1")
  echo "$ip"
}

# Helpers: random strings
random_string() {
  openssl rand -hex 16 2>/dev/null || tr -dc 'a-f0-9' < /dev/urandom | head -c 32
}
random_hex64() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

# Read value from existing env file (if present)
get_env() {
  local key="$1"
  local env_path="${INSTALL_DIR%/}/${ENV_FILE}"
  [[ -f "$env_path" ]] || { printf ""; return 0; }
  local line
  line="$(grep -E "^${key}=" "$env_path" | tail -n1 || true)"
  line="${line#*=}"
  # strip CR (если файл случайно в CRLF)
  line="${line%$'\r'}"
  # снимем обрамляющие кавычки, если есть
  line="${line%\"}"; line="${line#\"}"
  printf "%s" "$line"
}

usage() {
  cat <<USAGE
Использование: sudo bash install_v2.sh [опции]

Опции:
  --install-dir PATH           Каталог установки (по умолчанию: /opt/hw-monitor)
  --compose-url URL            Скачать docker-compose.prod.yml по URL
  --compose-file-url URL       Доп. URL для загрузки compose (по умолчанию: GitHub)
  --compose-file NAME          Имя compose-файла (по умолчанию: docker-compose.prod.yml)
  --env-file NAME              Имя файла окружения (по умолчанию: .env.prod)
  --project-name NAME          Имя проекта Docker Compose (по умолчанию: hw-monitor)
  --non-interactive            Fail on missing inputs instead of prompting

  --next-tag TAG               Override Next.js image tag
  --nginx-tag TAG              Override Nginx image tag
  --licd-tag TAG               Override licd image tag

  --basic-auth-user USER       Username for nginx basic auth (optional)
  --basic-auth-pass PASS       Password for nginx basic auth (optional)

Notes:
  * Astra Linux определяется автоматически; приоритет — пакет docker.io.
    Если недоступен, используется официальный репозиторий Docker для Debian (bullseye).
USAGE
}

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --install-dir) INSTALL_DIR="$2"; shift 2;;
      --compose-url) COMPOSE_URL="$2"; shift 2;;
      --compose-file) COMPOSE_FILE="$2"; shift 2;;
      --env-file) ENV_FILE="$2"; shift 2;;
      --project-name) PROJECT_NAME="$2"; shift 2;;
      --non-interactive) NON_INTERACTIVE=1; shift;;

      --next-tag) NEXT_TAG="$2"; shift 2;;
      --nginx-tag) NGINX_TAG="$2"; shift 2;;
      --licd-tag) LICD_TAG="$2"; shift 2;;

      --basic-auth-user) BASIC_AUTH_USER="$2"; shift 2;;
      --basic-auth-pass) BASIC_AUTH_PASS="$2"; shift 2;;

      -h|--help) usage; exit 0;;
      *) err "Неизвестная опция: $1"; usage; exit 2;;
    esac
  done

  prompt_if_empty INSTALL_DIR "Каталог установки" "/opt/hw-monitor"
  set_nginx_auth_file

  log "Проверяю/устанавливаю Docker и Compose"
  ensure_docker

  log "Готовлю директории в ${INSTALL_DIR}"
  prepare_dirs

  log "Получаю compose-файл"
  fetch_compose_if_needed

  log "Подготавлию файл окружения (интерактивно, если нет --non-interactive)"
  ensure_env_file

  log "Устанавливаю hwctl (локальный и глобальный симлинк)"
  install_hwctl

  log "Генерирую .htpasswd, если заданы креды"
  generate_htpasswd_if_needed

  log "Патчу теги образов (если заданы)"
  patch_image_tags_if_requested || true

  log "Поднимаю стек"
  bring_up_stack

  log "Готово."
}

main "$@"
