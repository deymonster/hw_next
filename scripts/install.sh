#!/usr/bin/env bash
set -euo pipefail

# =========================
# HW Monitor Installer (Ubuntu/Debian)
# Simplified version — automatic Docker & Compose installation via get.docker.com
# =========================

# Требуем root-права
if [[ $EUID -ne 0 ]]; then
  echo "⚠️  Этот скрипт требует root-доступа. Запусти через: sudo ./install.sh"
  exit 1
fi

# Defaults
SERVER_IP=""
ADMIN_EMAIL="admin@example.com"
TELEGRAM_BOT_TOKEN=""
DOCKER_COMPOSE_CMD=""

INSTALL_DIR="${INSTALL_DIR:-/opt/hw-monitor}"
COMPOSE_FILE="${COMPOSE_FILE:-$INSTALL_DIR/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$INSTALL_DIR/.env.prod}"
NGINX_AUTH_DIR="${NGINX_AUTH_DIR:-$INSTALL_DIR/nginx/auth}"
NGINX_AUTH_FILE="${NGINX_AUTH_FILE:-$NGINX_AUTH_DIR/.htpasswd}"

COMPOSE_FILE_URL="${COMPOSE_FILE_URL:-https://github.com/deymonster/hw_next/raw/refs/heads/main/docker-compose.prod.yml}"

BASIC_AUTH_USER="${BASIC_AUTH_USER:-admin}"
BASIC_AUTH_PASSWORD="${BASIC_AUTH_PASSWORD:-admin}"

# Per-image tags (can be set to "auto" to fetch latest via Docker Hub if jq is available)
NEXT_TAG="${NEXT_TAG:-latest}"
NGINX_TAG="${NGINX_TAG:-v1.0.0-alpha.7}"
LICD_TAG="${LICD_TAG:-v1.0.0-alpha.7}"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --server-ip) SERVER_IP="$2"; shift 2 ;;
    --admin-email) ADMIN_EMAIL="$2"; shift 2 ;;
    --telegram-bot-token) TELEGRAM_BOT_TOKEN="$2"; shift 2 ;;
    --install-dir)
      INSTALL_DIR="$2"
      COMPOSE_FILE="$INSTALL_DIR/docker-compose.prod.yml"
      ENV_FILE="$INSTALL_DIR/.env.prod"
      NGINX_AUTH_DIR="$INSTALL_DIR/nginx/auth"
      NGINX_AUTH_FILE="$INSTALL_DIR/nginx/auth"
      shift 2 ;;
    --compose-url) COMPOSE_FILE_URL="$2"; shift 2 ;;
    --basic-auth-user) BASIC_AUTH_USER="$2"; shift 2 ;;
    --basic-auth-password) BASIC_AUTH_PASSWORD="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# interactive input helpers
prompt_value() {
  local label="$1"
  local def="${2:-}"
  read -r -p "$label [${def}]: " val
  printf "%s" "${val:-$def}"
}

prompt_email() {
  local label="$1"
  local def="${2:-}"
  while true; do
    local v
    v="$(prompt_value "$label" "$def")"
    if [[ "$v" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
      printf "%s" "$v"
      return 0
    fi
    echo "Неверный email, попробуйте снова."
  done
}

prompt_bool() {
  local label="$1"
  local def="${2:-false}"
  while true; do
    local v
    v="$(prompt_value "$label (true/false)" "$def")"
    case "${v,,}" in
      true|false) printf "%s" "${v,,}"; return 0 ;;
    esac
    echo "Введите true или false."
  done
}

# Detect server IP
detect_ip() {
  if [[ -n "${SERVER_IP}" ]]; then
    echo "${SERVER_IP}"
    return
  fi
  ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
  [[ -z "$ip" ]] && ip=$(curl -s http://ifconfig.me || echo "127.0.0.1")
  echo "$ip"
}
SERVER_IP="$(detect_ip)"
if [ -t 0 ]; then
  SERVER_IP="$(prompt_value "Укажи IP/домен сервера" "$SERVER_IP")"
fi
echo "Using SERVER_IP=${SERVER_IP}"

# Random helpers
random_string() {
  openssl rand -hex 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-f0-9' | head -c 32
}
# helper: генератор длинного hex (64 символа)
random_hex64() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}
# helper: случайная base64-строка
random_b64() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 | tr -d '\n'
  else
    head -c 32 /dev/urandom | base64 | tr -d '\n'
  fi
}

# interactive input helpers
prompt_value() {
  local label="$1"
  local def="${2:-}"
  read -r -p "$label [${def}]: " val
  printf "%s" "${val:-$def}"
}

prompt_email() {
  local label="$1"
  local def="${2:-}"
  while true; do
    local v
    v="$(prompt_value "$label" "$def")"
    if [[ "$v" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
      printf "%s" "$v"
      return 0
    fi
    echo "Неверный email, попробуйте снова."
  done
}

prompt_bool() {
  local label="$1"
  local def="${2:-false}"
  while true; do
    local v
    v="$(prompt_value "$label (true/false)" "$def")"
    case "${v,,}" in
      true|false) printf "%s" "${v,,}"; return 0 ;;
    esac
    echo "Введите true или false."
  done
}

# detect latest tag from Docker Hub (if jq exists)
detect_latest_tag() {
  local repo="$1"
  if command -v jq >/dev/null 2>&1; then
    local latest
    latest="$(curl -s "https://hub.docker.com/v2/repositories/${repo}/tags/?page_size=100" \
      | jq -r '[.results[]] | sort_by(.last_updated) | reverse | .[0].name')"
    if [ -n "$latest" ] && [ "$latest" != "null" ]; then
      echo "$latest"
      return 0
    fi
  fi
  echo ""
}

# -----------------------------
# Astra Linux 1.7: ensure network repositories
# -----------------------------
ensure_astra_repos() {
  echo "🔧 Настраиваю репозитории Astra Linux 1.7..."

  # Отключаем CD-ROM источники
  for f in /etc/apt/sources.list /etc/apt/sources.list.d/*.list; do
    if [ -f "$f" ]; then
      sed -i 's/^\s*deb\s\+cdrom:/# &/g' "$f" || true
    fi
  done

  # Подключаем официальные сетевые репозитории Astra 1.7
  mkdir -p /etc/apt/sources.list.d
  tee /etc/apt/sources.list.d/astra.list >/dev/null <<'EOF'
deb https://dl.astralinux.ru/astra/stable/1.7_x86-64/repository-main/ 1.7_x86-64 main contrib non-free
deb https://dl.astralinux.ru/astra/stable/1.7_x86-64/repository-update/ 1.7_x86-64 main contrib non-free
deb https://dl.astralinux.ru/astra/stable/1.7_x86-64/repository-base/ 1.7_x86-64 main contrib non-free
deb https://dl.astralinux.ru/astra/stable/1.7_x86-64/repository-extended/ 1.7_x86-64 main contrib non-free
deb https://dl.astralinux.ru/astra/stable/1.7_x86-64/repository-extended/ 1.7_x86-64 astra-ce
EOF

  # Обновляем индексы и ставим HTTPS поддержку для APT
  apt-get update -y || true
  apt-get install -y apt-transport-https ca-certificates || true
  apt-get update -y || true

  echo "✅ Репозитории Astra 1.7 настроены."
}

# -----------------------------
# Docker installation (simplified)
# -----------------------------
install_docker_if_needed() {
  . /etc/os-release 2>/dev/null || true
  local distro_string="${ID:-} ${NAME:-} ${PRETTY_NAME:-} ${ID_LIKE:-}"
  local is_astra=false
  if echo "$distro_string" | tr '[:upper:]' '[:lower:]' | grep -q 'astra'; then
    is_astra=true
  fi

  local target_user="${SUDO_USER:-$(logname 2>/dev/null || echo "$USER")}"
  [ "$target_user" = "root" ] && target_user="$USER"

  if command -v docker >/dev/null 2>&1; then
    systemctl enable --now docker || true
    if id -nG "$target_user" 2>/dev/null | grep -qw docker; then
      echo "ℹ️  Пользователь $target_user уже в группе docker."
    else
      usermod -aG docker "$target_user" || true
      echo "✅ Добавил $target_user в группу docker. Перезайдите в сессию (или выполните 'newgrp docker')."
    fi
    return
  fi

  if [ "$is_astra" = true ]; then
    echo "ℹ️  Обнаружена Astra Linux — включаю сетевые репозитории и ставлю docker.io."
    ensure_astra_repos
    apt-get install -y docker.io docker-compose-plugin || apt-get install -y docker.io
  else
    echo "🚀 Устанавливаю Docker и Compose через официальный скрипт..."
    set +e
    curl -fsSL https://get.docker.com | sh
    rc=$?
    set -e

    if [ "$rc" -ne 0 ]; then
      echo "⚠️  get.docker.com не завершился успешно. Перехожу к ручной установке (Debian-совместимая система)."
      rm -f /etc/apt/sources.list.d/docker.list || true
      apt-get update -y
      apt-get install -y ca-certificates curl gnupg lsb-release || true

      local debian_codename=""
      if command -v lsb_release >/dev/null 2>&1; then
        debian_codename="$(lsb_release -cs 2>/dev/null || true)"
      fi
      if [[ -z "$debian_codename" || "$debian_codename" == "n/a" ]]; then
        local dv
        dv="$(cut -d'.' -f1 /etc/debian_version 2>/dev/null || echo '')"
        case "$dv" in
          12) debian_codename="bookworm" ;;
          11) debian_codename="bullseye" ;;
          10) debian_codename="buster" ;;
          *)  debian_codename="bullseye" ;;
        esac
      fi

      install -m 0755 -d /etc/apt/keyrings || true
      curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc || true
      chmod a+r /etc/apt/keyrings/docker.asc || true
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian ${debian_codename} stable" > /etc/apt/sources.list.d/docker.list
      apt-get update -y
      if ! apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin; then
        echo "ℹ️  Пакеты docker-ce недоступны, ставлю docker.io."
        apt-get install -y docker.io
      fi
    fi
  fi

  # Запускаем Docker и добавляем пользователя в группу
  systemctl enable --now docker || true
  usermod -aG docker "${SUDO_USER:-$USER}" || true
}

# Фолбэк: ставим docker-compose бинарник, если нет плагина
install_compose_cli_fallback() {
  if ! command -v docker-compose >/dev/null 2>&1; then
    echo "ℹ️  Устанавливаю docker-compose (CLI) как fallback..."
    curl -fL "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
  fi
}

detect_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
  elif docker-compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
  else
    install_compose_cli_fallback
    if docker-compose version >/dev/null 2>&1; then
      DOCKER_COMPOSE_CMD="docker-compose"
    else
      echo "❌ Docker Compose не найден. Проверь установку Docker/Compose."
      exit 1
    fi
  fi
}

# -----------------------------
# Files & environment setup
# -----------------------------
ensure_compose_file() {
  mkdir -p "$(dirname "$COMPOSE_FILE")"
  if [ -f "$COMPOSE_FILE" ]; then
    echo "Compose-файл найден: $COMPOSE_FILE"
    return
  fi

  echo "Скачиваю compose-файл из $COMPOSE_FILE_URL ..."
  curl -fsSL "$COMPOSE_FILE_URL" -o "$COMPOSE_FILE"
}

# Read value from existing env file (if present)
get_env() {
  local key="$1"
  if [ -f "$ENV_FILE" ]; then
    grep -E "^${key}=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true
  fi
}

ensure_env_file() {
  mkdir -p "$(dirname "$ENV_FILE")"

  if [ -f "$ENV_FILE" ]; then
    echo "♻️  Найден существующий $ENV_FILE — значения будут переиспользованы при генерации"
  else
    echo "🆕 Создаю файл окружения: $ENV_FILE"
  fi

  local val

  val="${NEXT_PUBLIC_SERVER_IP:-$(get_env NEXT_PUBLIC_SERVER_IP)}"
  if [ -z "$val" ]; then
    val="$SERVER_IP"
  fi
  NEXT_PUBLIC_SERVER_IP="$val"

  local default_base="http://${NEXT_PUBLIC_SERVER_IP}"

  val="${NEXT_PUBLIC_BASE_URL:-$(get_env NEXT_PUBLIC_BASE_URL)}"
  if [ -z "$val" ]; then
    val="$default_base"
  fi
  NEXT_PUBLIC_BASE_URL="$val"

  val="${NEXT_PUBLIC_URL:-$(get_env NEXT_PUBLIC_URL)}"
  if [ -z "$val" ]; then
    val="$NEXT_PUBLIC_BASE_URL"
  fi
  NEXT_PUBLIC_URL="$val"

  val="${NEXTAUTH_URL:-$(get_env NEXTAUTH_URL)}"
  if [ -z "$val" ]; then
    val="$NEXT_PUBLIC_URL"
  fi
  NEXTAUTH_URL="$val"

  val="${NEXT_PUBLIC_STORAGE_URL:-$(get_env NEXT_PUBLIC_STORAGE_URL)}"
  if [ -z "$val" ]; then
    val="$NEXT_PUBLIC_BASE_URL"
  fi
  NEXT_PUBLIC_STORAGE_URL="$val"

  val="${NEXT_PUBLIC_UPLOADS_BASE_URL:-$(get_env NEXT_PUBLIC_UPLOADS_BASE_URL)}"
  if [ -z "$val" ]; then
    val="$NEXT_PUBLIC_STORAGE_URL"
  fi
  NEXT_PUBLIC_UPLOADS_BASE_URL="$val"

  val="${NEXT_PUBLIC_MEDIA_URL:-$(get_env NEXT_PUBLIC_MEDIA_URL)}"
  if [ -z "$val" ]; then
    val="$NEXT_PUBLIC_UPLOADS_BASE_URL"
  fi
  NEXT_PUBLIC_MEDIA_URL="$val"

  val="${POSTGRES_USER:-$(get_env POSTGRES_USER)}"
  if [ -z "$val" ]; then
    val="hw_monitor"
  fi
  POSTGRES_USER="$val"

  val="${POSTGRES_PASSWORD:-$(get_env POSTGRES_PASSWORD)}"
  if [ -z "$val" ]; then
    val="$(random_hex64)"
  fi
  POSTGRES_PASSWORD="$val"

  val="${POSTGRES_DB:-$(get_env POSTGRES_DB)}"
  if [ -z "$val" ]; then
    val="hw_monitor"
  fi
  POSTGRES_DB="$val"

  val="${POSTGRES_HOST:-$(get_env POSTGRES_HOST)}"
  if [ -z "$val" ]; then
    val="postgres"
  fi
  POSTGRES_HOST="$val"

  val="${POSTGRES_PORT:-$(get_env POSTGRES_PORT)}"
  if [ -z "$val" ]; then
    val="5432"
  fi
  POSTGRES_PORT="$val"

  DATABASE_URL="${DATABASE_URL:-$(get_env DATABASE_URL)}"
  if [ -z "$DATABASE_URL" ]; then
    DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
  fi

  val="${PROMETHEUS_PORT:-$(get_env PROMETHEUS_PORT)}"
  if [ -z "$val" ]; then
    val="9090"
  fi
  PROMETHEUS_PORT="$val"

  val="${PROMETHEUS_INTERNAL_URL:-$(get_env PROMETHEUS_INTERNAL_URL)}"
  if [ -z "$val" ]; then
    val="http://prometheus:${PROMETHEUS_PORT}"
  fi
  PROMETHEUS_INTERNAL_URL="$val"

  val="${PROMETHEUS_PROXY_URL:-$(get_env PROMETHEUS_PROXY_URL)}"
  if [ -z "$val" ]; then
    val="http://nginx-proxy:8080"
  fi
  PROMETHEUS_PROXY_URL="$val"

  val="${PROMETHEUS_USE_SSL:-$(get_env PROMETHEUS_USE_SSL)}"
  if [ -z "$val" ]; then
    val="False"
  fi
  PROMETHEUS_USE_SSL="$val"

  val="${PROMETHEUS_TARGETS_PATH:-$(get_env PROMETHEUS_TARGETS_PATH)}"
  if [ -z "$val" ]; then
    val="./prometheus/targets/windows_targets.json"
  fi
  PROMETHEUS_TARGETS_PATH="$val"

  val="${PROMETHEUS_USERNAME:-$(get_env PROMETHEUS_USERNAME)}"
  if [ -z "$val" ]; then
    val="$BASIC_AUTH_USER"
  fi
  PROMETHEUS_USERNAME="$val"

  val="${PROMETHEUS_AUTH_PASSWORD:-$(get_env PROMETHEUS_AUTH_PASSWORD)}"
  if [ -z "$val" ]; then
    val="$BASIC_AUTH_PASSWORD"
  fi
  PROMETHEUS_AUTH_PASSWORD="$val"

  val="${NODE_EXPORTER_PORT:-$(get_env NODE_EXPORTER_PORT)}"
  if [ -z "$val" ]; then
    val="9100"
  fi
  NODE_EXPORTER_PORT="$val"

  val="${TELEGRAM_BOT_TOKEN:-$(get_env TELEGRAM_BOT_TOKEN)}"
  TELEGRAM_BOT_TOKEN="$val"

  val="${TELEGRAM_CHAT_ID:-$(get_env TELEGRAM_CHAT_ID)}"
  TELEGRAM_CHAT_ID="$val"

  val="${ADMIN_TELEGRAM_CHAT_ID:-$(get_env ADMIN_TELEGRAM_CHAT_ID)}"
  ADMIN_TELEGRAM_CHAT_ID="$val"

  val="${ADMIN_USERNAME:-$(get_env ADMIN_USERNAME)}"
  if [ -z "$val" ]; then
    val="admin"
  fi
  ADMIN_USERNAME="$val"

  val="${ADMIN_PASSWORD:-$(get_env ADMIN_PASSWORD)}"
  if [ -z "$val" ]; then
    val="$(random_hex64)"
  fi
  ADMIN_PASSWORD="$val"

  local existing_admin_email
  existing_admin_email="$(get_env ADMIN_EMAIL)"
  if [ -n "$existing_admin_email" ] && [ "$ADMIN_EMAIL" = "admin@example.com" ]; then
    ADMIN_EMAIL="$existing_admin_email"
  fi
  if [ -z "$ADMIN_EMAIL" ]; then
    ADMIN_EMAIL="admin@example.com"
  fi

  val="${AGENT_HANDSHAKE_KEY:-$(get_env AGENT_HANDSHAKE_KEY)}"
  if [ -z "$val" ]; then
    val="$(random_hex64)"
  fi
  AGENT_HANDSHAKE_KEY="$val"

  val="${HANDSHAKE_KEY:-$(get_env HANDSHAKE_KEY)}"
  if [ -z "$val" ]; then
    val="$AGENT_HANDSHAKE_KEY"
  fi
  HANDSHAKE_KEY="$val"

  val="${NODE_ENV:-$(get_env NODE_ENV)}"
  if [ -z "$val" ]; then
    val="production"
  fi
  NODE_ENV="$val"

  val="${SMTP_HOST:-$(get_env SMTP_HOST)}"
  if [ -z "$val" ]; then
    val="smtp.example.com"
  fi
  SMTP_HOST="$val"

  val="${SMTP_PORT:-$(get_env SMTP_PORT)}"
  if [ -z "$val" ]; then
    val="587"
  fi
  SMTP_PORT="$val"

  val="${SMTP_SECURE:-$(get_env SMTP_SECURE)}"
  if [ -z "$val" ]; then
    val="false"
  fi
  SMTP_SECURE="$val"

  val="${SMTP_USER:-$(get_env SMTP_USER)}"
  SMTP_USER="$val"

  val="${SMTP_PASSWORD:-$(get_env SMTP_PASSWORD)}"
  SMTP_PASSWORD="$val"

  val="${SMTP_FROM_EMAIL:-$(get_env SMTP_FROM_EMAIL)}"
  SMTP_FROM_EMAIL="$val"

  val="${SMTP_FROM_NAME:-$(get_env SMTP_FROM_NAME)}"
  if [ -z "$val" ]; then
    val="HW Monitor"
  fi
  SMTP_FROM_NAME="$val"

  val="${ENCRYPTION_KEY:-$(get_env ENCRYPTION_KEY)}"
  if [ -z "$val" ]; then
    val="$(random_hex64)"
  fi
  ENCRYPTION_KEY="$val"

  val="${REDIS_PASSWORD:-$(get_env REDIS_PASSWORD)}"
  if [ -z "$val" ]; then
    val="$(random_hex64)"
  fi
  REDIS_PASSWORD="$val"

  val="${REDIS_HOST:-$(get_env REDIS_HOST)}"
  if [ -z "$val" ]; then
    val="redis"
  fi
  REDIS_HOST="$val"

  val="${REDIS_PORT:-$(get_env REDIS_PORT)}"
  if [ -z "$val" ]; then
    val="6379"
  fi
  REDIS_PORT="$val"

  REDIS_URL="${REDIS_URL:-$(get_env REDIS_URL)}"
  if [ -z "$REDIS_URL" ]; then
    REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"
  fi

  val="${NEXTAUTH_SECRET:-$(get_env NEXTAUTH_SECRET)}"
  if [ -z "$val" ]; then
    val="$(random_b64)"
  fi
  NEXTAUTH_SECRET="$val"

  val="${LICD_URL:-$(get_env LICD_URL)}"
  if [ -z "$val" ]; then
    val="http://licd:8081"
  fi
  LICD_URL="$val"

  cat >"$ENV_FILE" <<EOF
# Autogenerated by install.sh
# Base URLs
NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
NEXT_PUBLIC_SERVER_IP=${NEXT_PUBLIC_SERVER_IP}
NEXT_PUBLIC_URL=${NEXT_PUBLIC_URL}
NEXTAUTH_URL=${NEXTAUTH_URL}

# PostgreSQL
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_HOST=${POSTGRES_HOST}
POSTGRES_PORT=${POSTGRES_PORT}
DATABASE_URL=${DATABASE_URL}

# Prometheus
PROMETHEUS_PORT=${PROMETHEUS_PORT}
PROMETHEUS_INTERNAL_URL=${PROMETHEUS_INTERNAL_URL}
PROMETHEUS_PROXY_URL=${PROMETHEUS_PROXY_URL}
PROMETHEUS_USE_SSL=${PROMETHEUS_USE_SSL}
PROMETHEUS_TARGETS_PATH=${PROMETHEUS_TARGETS_PATH}
PROMETHEUS_USERNAME=${PROMETHEUS_USERNAME}
PROMETHEUS_AUTH_PASSWORD=${PROMETHEUS_AUTH_PASSWORD}

# Node Exporter
NODE_EXPORTER_PORT=${NODE_EXPORTER_PORT}

# Telegram
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
ADMIN_TELEGRAM_CHAT_ID=${ADMIN_TELEGRAM_CHAT_ID}

# Admin
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_EMAIL=${ADMIN_EMAIL}

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
SMTP_FROM_NAME="${SMTP_FROM_NAME}"

# Encryption
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_URL=${REDIS_URL}

# Auth
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Storage
NEXT_PUBLIC_STORAGE_URL=${NEXT_PUBLIC_STORAGE_URL}
NEXT_PUBLIC_UPLOADS_BASE_URL=${NEXT_PUBLIC_UPLOADS_BASE_URL}
NEXT_PUBLIC_MEDIA_URL=${NEXT_PUBLIC_MEDIA_URL}

# LICD
LICD_URL=${LICD_URL}
EOF
}

prepare_dirs() {
  mkdir -p "$INSTALL_DIR/storage/logs" "$INSTALL_DIR/storage/uploads"
  chown -R 1001:65533 "$INSTALL_DIR/storage/logs" "$INSTALL_DIR/storage/uploads" 2>/dev/null || true
  chmod -R 777 "$INSTALL_DIR/storage/logs" "$INSTALL_DIR/storage/uploads" || true
}

ensure_nginx_auth() {
  mkdir -p "$NGINX_AUTH_DIR"

  # Используем те же креды, что и Next.js/Prometheus
  local user="${PROMETHEUS_USERNAME:-$BASIC_AUTH_USER}"
  local pass="${PROMETHEUS_AUTH_PASSWORD:-$BASIC_AUTH_PASSWORD}"

  if [ -f "$NGINX_AUTH_FILE" ]; then
    echo ".htpasswd найден: $NGINX_AUTH_FILE (перезапишу для синхронизации с env)"
  else
    echo "Создаю .htpasswd (basic auth для nginx)..."
  fi

  # Генерация хеша для Basic Auth
  if command -v openssl >/dev/null 2>&1; then
    HASH=$(openssl passwd -apr1 "$pass")
  elif command -v htpasswd >/dev/null 2>&1; then
    HASH=$(htpasswd -nb "$user" "$pass" | cut -d: -f2-)
  else
    echo "⚠️  OpenSSL и htpasswd не найдены. Использую fallback (base64)."
    HASH=$(echo -n "$pass" | base64)
  fi

  echo "${user}:${HASH}" > "$NGINX_AUTH_FILE"
}

# -----------------------------
# Image tag patching
# -----------------------------
patch_compose_image_tags() {
  # Resolve image tags; support "auto" via Docker Hub
  NEXT_TAG="${NEXT_TAG:-latest}"
  NGINX_TAG="${NGINX_TAG:-v1.0.0-alpha.7}"
  LICD_TAG="${LICD_TAG:-v1.0.0-alpha.7}"

  if [ "$NEXT_TAG" = "auto" ]; then
    local detected
    detected="$(detect_latest_tag "deymonster/hw-monitor")"
    if [ -n "$detected" ]; then
      NEXT_TAG="$detected"
    else
      NEXT_TAG="latest"
    fi
  fi

  if [ "$NGINX_TAG" = "auto" ]; then
    local detected
    detected="$(detect_latest_tag "deymonster/hw-monitor-nginx-combined")"
    if [ -n "$detected" ]; then
      NGINX_TAG="$detected"
    else
      NGINX_TAG="v1.0.0-alpha.7"
    fi
  fi

  if [ "$LICD_TAG" = "auto" ]; then
    local detected
    detected="$(detect_latest_tag "deymonster/hw-monitor-licd")"
    if [ -n "$detected" ]; then
      LICD_TAG="$detected"
    else
      LICD_TAG="v1.0.0-alpha.7"
    fi
  fi

  local tmp
  tmp="$(mktemp)"

  sed -E \
    -e "s|(image:\s*deymonster/hw-monitor:)[^[:space:]]+|\1${NEXT_TAG}|g" \
    -e "s|(image:\s*deymonster/hw-monitor-nginx-combined:)[^[:space:]]+|\1${NGINX_TAG}|g" \
    -e "s|(image:\s*deymonster/hw-monitor-licd:)[^[:space:]]+|\1${LICD_TAG}|g" \
    "$COMPOSE_FILE" > "$tmp" && mv "$tmp" "$COMPOSE_FILE"
}

# -----------------------------
# Run
# -----------------------------
is_installed() {
  [ -f "$COMPOSE_FILE" ] && [ -f "$ENV_FILE" ] || return 1
  local ids=""
  if docker compose version >/dev/null 2>&1; then
    ids="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q 2>/dev/null || true)"
  elif docker-compose version >/dev/null 2>&1; then
    ids="$(docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q 2>/dev/null || true)"
  fi
  [ -n "$ids" ]
}

install_hwctl() {
  mkdir -p "$INSTALL_DIR"
  cat > "$INSTALL_DIR/hwctl.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="${INSTALL_DIR:-/opt/hw-monitor}"
ENV_FILE="${ENV_FILE:-$INSTALL_DIR/.env.prod}"
COMPOSE_FILE="${COMPOSE_FILE:-$INSTALL_DIR/docker-compose.prod.yml}"

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif docker-compose version >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "❌ Docker Compose не найден."
  exit 1
fi

action="${1:-}"
case "$action" in
  up)      sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d ;;
  restart) sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" restart ;;
  stop)    sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stop ;;
  down)    sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down ;;
  logs)    sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs -f ;;
  ps)      sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps ;;
  pull)    sudo $DC --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull ;;
  *) echo "Usage: hwctl {up|restart|stop|down|logs|ps|pull}"; exit 1 ;;
esac
EOF
  chmod +x "$INSTALL_DIR/hwctl.sh" || true
  ln -sf "$INSTALL_DIR/hwctl.sh" /usr/local/bin/hwctl 2>/dev/null || true
}

compose_up() {
  install_docker_if_needed
  detect_compose_cmd
  ensure_compose_file
  patch_compose_image_tags
  ensure_env_file
  prepare_dirs
  ensure_nginx_auth
  install_hwctl

  echo "Pulling images and starting services..."
  cd "$(dirname "$COMPOSE_FILE")"
  ${DOCKER_COMPOSE_CMD} --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull || true
  ${DOCKER_COMPOSE_CMD} --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
}

main() {
  # Если уже установлен, не перетираем, даём управление
  if is_installed; then
    install_hwctl
    echo "✅ Сервис уже установлен."
    echo "------------------------------------------------------------"
    echo "Расположение:"
    echo "  INSTALL_DIR=${INSTALL_DIR}"
    echo "  COMPOSE_FILE=${COMPOSE_FILE}"
    echo "  ENV_FILE=${ENV_FILE}"
    echo "Управление:"
    echo "  Локальный скрипт: ${INSTALL_DIR}/hwctl.sh"
    echo "  Глобальная команда: hwctl {up|restart|stop|down|logs|ps|pull}"
    echo "Примеры:"
    echo "  hwctl ps"
    echo "  hwctl restart"
    echo "------------------------------------------------------------"
    if [ -t 0 ]; then
      local do_restart
      do_restart="$(prompt_bool "Перезапустить сейчас?" "false")"
      if [ "$do_restart" = "true" ]; then
        hwctl restart || ${DOCKER_COMPOSE_CMD} --env-file "$ENV_FILE" -f "$COMPOSE_FILE" restart
      fi
    fi
    exit 0
  fi

  compose_up
  echo "✅ Установка завершена!"
  echo "------------------------------------------------------------"
  echo "Сервисы доступны по адресам:"
  echo "  Next.js:    http://${SERVER_IP}:3000"
  echo "  Nginx:      http://${SERVER_IP}:80"
  echo "  Prometheus: http://${SERVER_IP}:8080"
  echo "------------------------------------------------------------"
  echo "Установлено:"
  echo "  SERVER_IP=${SERVER_IP}"
  echo "  INSTALL_DIR=${INSTALL_DIR}"
  echo "  COMPOSE_FILE=${COMPOSE_FILE}"
  echo "  ENV_FILE=${ENV_FILE}"
  echo "  NGINX_AUTH_FILE=${NGINX_AUTH_FILE}"
  echo "------------------------------------------------------------"
  echo "Управление:"
  echo "  Локальный скрипт: ${INSTALL_DIR}/hwctl.sh"
  echo "  Глобальная команда: hwctl {up|restart|stop|down|logs|ps|pull}"
  echo "Примеры:"
  echo "  hwctl ps"
  echo "  hwctl restart"
  echo "------------------------------------------------------------"
  echo "Данные БД:"
  echo "  POSTGRES_DB=${POSTGRES_DB:-}"
  echo "  POSTGRES_USER=${POSTGRES_USER:-}"
  echo "  POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-}"
  echo "  DATABASE_URL=${DATABASE_URL:-}"
  echo "Redis:"
  echo "  REDIS_PASSWORD=${REDIS_PASSWORD:-}"
  echo "  REDIS_URL=${REDIS_URL:-}"
  echo "Секреты (сохраните в безопасном месте):"
  echo "  NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-}"
  echo "  ENCRYPTION_KEY=${ENCRYPTION_KEY:-}"
  if [ -n "${AGENT_HANDSHAKE_KEY:-}" ]; then
    echo "  AGENT_HANDSHAKE_KEY=${AGENT_HANDSHAKE_KEY}"
  fi
  echo "------------------------------------------------------------"
}

main "$@"

