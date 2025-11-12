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
      NGINX_AUTH_FILE="$NGINX_AUTH_DIR/.htpasswd"
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
# Docker installation (simplified)
# -----------------------------
install_docker_if_needed() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "🚀 Устанавливаю Docker и Compose через официальный скрипт..."
    curl -fsSL https://get.docker.com | sh
  fi

  systemctl enable --now docker || true
  usermod -aG docker "${SUDO_USER:-$USER}" || true
}

detect_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
  elif docker-compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
  else
    echo "❌ Docker Compose не найден. Проверь установку Docker."
    exit 1
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

ensure_env_file() {
  # helper: получить значение переменной из существующего .env файла
  get_env() {
    local key="$1"
    if [ -f "$ENV_FILE" ]; then
      grep -E "^${key}=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true
    fi
  }

  echo "Синхронизирую $ENV_FILE (добавлю недостающие переменные, существующие сохраню)..."

  # Базовые (сохранение существующих значений)
  POSTGRES_USER="${POSTGRES_USER:-$(get_env POSTGRES_USER)}"
  POSTGRES_USER="${POSTGRES_USER:-hw}"

  POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(get_env POSTGRES_PASSWORD)}"
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(random_string)}"

  POSTGRES_DB="${POSTGRES_DB:-$(get_env POSTGRES_DB)}"
  POSTGRES_DB="${POSTGRES_DB:-hw}"

  POSTGRES_HOST="${POSTGRES_HOST:-$(get_env POSTGRES_HOST)}"
  POSTGRES_HOST="${POSTGRES_HOST:-postgres_container}"

  POSTGRES_PORT="${POSTGRES_PORT:-$(get_env POSTGRES_PORT)}"
  POSTGRES_PORT="${POSTGRES_PORT:-5432}"

  REDIS_PASSWORD="${REDIS_PASSWORD:-$(get_env REDIS_PASSWORD)}"
  REDIS_PASSWORD="${REDIS_PASSWORD:-$(random_string)}"

  REDIS_HOST="${REDIS_HOST:-$(get_env REDIS_HOST)}"
  REDIS_HOST="${REDIS_HOST:-redis_container}"

  REDIS_PORT="${REDIS_PORT:-$(get_env REDIS_PORT)}"
  REDIS_PORT="${REDIS_PORT:-6379}"

  NEXT_PUBLIC_BASE_URL="${NEXT_PUBLIC_BASE_URL:-$(get_env NEXT_PUBLIC_BASE_URL)}"
  NEXT_PUBLIC_BASE_URL="${NEXT_PUBLIC_BASE_URL:-http://${SERVER_IP}}"

  NEXT_PUBLIC_SERVER_IP="${NEXT_PUBLIC_SERVER_IP:-$(get_env NEXT_PUBLIC_SERVER_IP)}"
  NEXT_PUBLIC_SERVER_IP="${NEXT_PUBLIC_SERVER_IP:-${SERVER_IP}}"

  NEXTAUTH_URL="${NEXTAUTH_URL:-$(get_env NEXTAUTH_URL)}"
  NEXTAUTH_URL="${NEXTAUTH_URL:-http://${SERVER_IP}}"

  NEXT_PUBLIC_URL="${NEXT_PUBLIC_URL:-$(get_env NEXT_PUBLIC_URL)}"
  NEXT_PUBLIC_URL="${NEXT_PUBLIC_URL:-http://${SERVER_IP}}"

  PROMETHEUS_PORT="${PROMETHEUS_PORT:-$(get_env PROMETHEUS_PORT)}"
  PROMETHEUS_PORT="${PROMETHEUS_PORT:-9090}"

  NODE_EXPORTER_PORT="${NODE_EXPORTER_PORT:-$(get_env NODE_EXPORTER_PORT)}"
  NODE_EXPORTER_PORT="${NODE_EXPORTER_PORT:-9100}"

  TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-$(get_env TELEGRAM_BOT_TOKEN)}"
  TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-$(get_env TELEGRAM_CHAT_ID)}"
  ADMIN_TELEGRAM_CHAT_ID="${ADMIN_TELEGRAM_CHAT_ID:-$(get_env ADMIN_TELEGRAM_CHAT_ID)}"

  ADMIN_USERNAME="${ADMIN_USERNAME:-$(get_env ADMIN_USERNAME)}"
  ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"

  ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(get_env ADMIN_PASSWORD)}"
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

  ADMIN_EMAIL="${ADMIN_EMAIL:-$(get_env ADMIN_EMAIL)}"
  ADMIN_EMAIL="${ADMIN_EMAIL:-$(prompt_email "Введите email администратора" "admin@example.com")}"

  SMTP_HOST="${SMTP_HOST:-$(get_env SMTP_HOST)}"
  SMTP_HOST="${SMTP_HOST:-$(prompt_value "SMTP_HOST" "smtp.example.com")}"

  SMTP_PORT="${SMTP_PORT:-$(get_env SMTP_PORT)}"
  SMTP_PORT="${SMTP_PORT:-$(prompt_value "SMTP_PORT" "587")}"

  SMTP_SECURE="${SMTP_SECURE:-$(get_env SMTP_SECURE)}"
  SMTP_SECURE="${SMTP_SECURE:-$(prompt_bool "SMTP_SECURE" "false")}"

  SMTP_USER="${SMTP_USER:-$(get_env SMTP_USER)}"
  SMTP_USER="${SMTP_USER:-$(prompt_value "SMTP_USER" "user")}"

  SMTP_PASSWORD="${SMTP_PASSWORD:-$(get_env SMTP_PASSWORD)}"
  SMTP_PASSWORD="${SMTP_PASSWORD:-$(prompt_value "SMTP_PASSWORD" "password")}"

  SMTP_FROM_EMAIL="${SMTP_FROM_EMAIL:-$(get_env SMTP_FROM_EMAIL)}"
  SMTP_FROM_EMAIL="${SMTP_FROM_EMAIL:-$(prompt_value "SMTP_FROM_EMAIL" "noreply@example.com")}"

  SMTP_FROM_NAME="${SMTP_FROM_NAME:-$(get_env SMTP_FROM_NAME)}"
  SMTP_FROM_NAME="${SMTP_FROM_NAME:-$(prompt_value "SMTP_FROM_NAME" "NITRINOnet Monitoring System")}"

  ENCRYPTION_KEY="${ENCRYPTION_KEY:-$(get_env ENCRYPTION_KEY)}"
  ENCRYPTION_KEY="${ENCRYPTION_KEY:-$(random_hex64)}"

  NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(get_env NEXTAUTH_SECRET)}"
  NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(random_b64)}"

  NEXT_PUBLIC_STORAGE_URL="${NEXT_PUBLIC_STORAGE_URL:-$(get_env NEXT_PUBLIC_STORAGE_URL)}"
  NEXT_PUBLIC_STORAGE_URL="${NEXT_PUBLIC_STORAGE_URL:-http://${SERVER_IP}}"

  NEXT_PUBLIC_UPLOADS_BASE_URL="${NEXT_PUBLIC_UPLOADS_BASE_URL:-$(get_env NEXT_PUBLIC_UPLOADS_BASE_URL)}"
  NEXT_PUBLIC_UPLOADS_BASE_URL="${NEXT_PUBLIC_UPLOADS_BASE_URL:-http://${SERVER_IP}}"

  PROMETHEUS_SHARED_CONFIG_PATH="${PROMETHEUS_SHARED_CONFIG_PATH:-$(get_env PROMETHEUS_SHARED_CONFIG_PATH)}"
  PROMETHEUS_SHARED_CONFIG_PATH="${PROMETHEUS_SHARED_CONFIG_PATH:-/shared-config}"

  PROMETHEUS_INTERNAL_URL="${PROMETHEUS_INTERNAL_URL:-$(get_env PROMETHEUS_INTERNAL_URL)}"
  PROMETHEUS_INTERNAL_URL="${PROMETHEUS_INTERNAL_URL:-http://prometheus_container:9090}"

  LICD_URL="${LICD_URL:-$(get_env LICD_URL)}"
  LICD_URL="${LICD_URL:-http://licd:8081}"

  DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"
  REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"

  # Interactive prompts for key values (only when running in TTY and defaults are in use)
  if [ -t 0 ]; then
    [[ "$ADMIN_EMAIL" == "admin@example.com" ]] && ADMIN_EMAIL="$(prompt_email "Введите email администратора" "$ADMIN_EMAIL")"

    [[ "$SMTP_HOST" == "smtp.example.com" ]] && SMTP_HOST="$(prompt_value "SMTP host" "$SMTP_HOST")"
    [[ "$SMTP_PORT" == "587" ]] && SMTP_PORT="$(prompt_value "SMTP port" "$SMTP_PORT")"
    [[ "$SMTP_SECURE" == "false" ]] && SMTP_SECURE="$(prompt_bool "SMTP secure" "$SMTP_SECURE")"
    [[ "$SMTP_USER" == "user" ]] && SMTP_USER="$(prompt_value "SMTP user" "$SMTP_USER")"
    [[ "$SMTP_PASSWORD" == "password" ]] && SMTP_PASSWORD="$(prompt_value "SMTP password" "$SMTP_PASSWORD")"
    [[ "$SMTP_FROM_EMAIL" == "noreply@example.com" ]] && SMTP_FROM_EMAIL="$(prompt_value "SMTP from email" "$SMTP_FROM_EMAIL")"
    [[ "$SMTP_FROM_NAME" == "NITRINOnet Monitoring System" ]] && SMTP_FROM_NAME="$(prompt_value "SMTP from name" "$SMTP_FROM_NAME")"
  fi

  tee "$ENV_FILE" >/dev/null <<EOF
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
PROMETHEUS_PROXY_URL=${PROMETHEUS_PROXY_URL}
PROMETHEUS_USE_SSL=${PROMETHEUS_USE_SSL}
PROMETHEUS_TARGETS_PATH=${PROMETHEUS_TARGETS_PATH}
PROMETHEUS_USERNAME=${PROMETHEUS_USERNAME}
PROMETHEUS_AUTH_PASSWORD=${PROMETHEUS_AUTH_PASSWORD}
PROMETHEUS_SHARED_CONFIG_PATH=${PROMETHEUS_SHARED_CONFIG_PATH}
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
ADMIN_EMAIL=${ADMIN_EMAIL}

# Windows agents
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

# Storage
NEXT_PUBLIC_STORAGE_URL=${NEXT_PUBLIC_STORAGE_URL}
NEXT_PUBLIC_UPLOADS_BASE_URL=${NEXT_PUBLIC_UPLOADS_BASE_URL}

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
compose_up() {
  install_docker_if_needed
  detect_compose_cmd
  ensure_compose_file
  patch_compose_image_tags
  ensure_env_file
  prepare_dirs
  ensure_nginx_auth

  echo "Pulling images and starting services..."
  cd "$(dirname "$COMPOSE_FILE")"
  ${DOCKER_COMPOSE_CMD} --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull || true
  ${DOCKER_COMPOSE_CMD} --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
}

main() {
  compose_up
  echo "✅ Установка завершена!"
  echo "------------------------------------------------------------"
  echo "Сервисы доступны по адресам:"
  echo "  Next.js:    http://${SERVER_IP}:3000"
  echo "  Nginx:      http://${SERVER_IP}:80"
  echo "  Prometheus: http://${SERVER_IP}:8080"
  echo "------------------------------------------------------------"
  echo "Проверка логов:"
  echo "  ${DOCKER_COMPOSE_CMD} -f \"$COMPOSE_FILE\" logs -f"
  echo "------------------------------------------------------------"
  echo "Установлено:"
  echo "  SERVER_IP=${SERVER_IP}"
  echo "  INSTALL_DIR=${INSTALL_DIR}"
  echo "  ENV_FILE=${ENV_FILE}"
  echo "  NGINX_AUTH_FILE=${NGINX_AUTH_FILE}"
}

main "$@"

