#!/usr/bin/env bash
set -euo pipefail

# =========================
# HW Monitor Installer (Ubuntu/Debian)
# Fully autonomous: downloads compose file, prepares env, directories, htpasswd, installs Docker/Compose, starts services.
# =========================

# Defaults
SERVER_IP=""
ADMIN_EMAIL="admin@example.com"
TELEGRAM_BOT_TOKEN=""
DOCKER_COMPOSE_CMD=""

# Where to store files on server
INSTALL_DIR="${INSTALL_DIR:-/opt/hw-monitor}"
COMPOSE_FILE="${COMPOSE_FILE:-$INSTALL_DIR/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$INSTALL_DIR/.env.prod}"
NGINX_AUTH_DIR="${NGINX_AUTH_DIR:-$INSTALL_DIR/nginx/auth}"
NGINX_AUTH_FILE="${NGINX_AUTH_FILE:-$NGINX_AUTH_DIR/.htpasswd}"

# Direct raw link to docker-compose.prod.yml
COMPOSE_FILE_URL="${COMPOSE_FILE_URL:-https://github.com/deymonster/hw_next/raw/refs/heads/main/docker-compose.prod.yml}"

# Basic auth for nginx
BASIC_AUTH_USER="${BASIC_AUTH_USER:-admin}"
BASIC_AUTH_PASSWORD="${BASIC_AUTH_PASSWORD:-admin}"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --server-ip)
      SERVER_IP="$2"; shift 2 ;;
    --admin-email)
      ADMIN_EMAIL="$2"; shift 2 ;;
    --telegram-bot-token)
      TELEGRAM_BOT_TOKEN="$2"; shift 2 ;;
    --install-dir)
      INSTALL_DIR="$2"
      COMPOSE_FILE="$INSTALL_DIR/docker-compose.prod.yml"
      ENV_FILE="$INSTALL_DIR/.env.prod"
      NGINX_AUTH_DIR="$INSTALL_DIR/nginx/auth"
      NGINX_AUTH_FILE="$NGINX_AUTH_DIR/.htpasswd"
      shift 2 ;;
    --compose-url)
      COMPOSE_FILE_URL="$2"; shift 2 ;;
    --basic-auth-user)
      BASIC_AUTH_USER="$2"; shift 2 ;;
    --basic-auth-password)
      BASIC_AUTH_PASSWORD="$2"; shift 2 ;;
    *)
      echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Detect server IP if not provided
detect_ip() {
  if [[ -n "${SERVER_IP}" ]]; then
    echo "${SERVER_IP}"
    return
  fi
  if command -v hostname >/dev/null 2>&1; then
    local ip
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [[ -n "${ip}" ]]; then
      echo "${ip}"; return
    fi
  fi
  if command -v curl >/dev/null 2>&1; then
    local ip
    ip=$(curl -s http://ifconfig.me || true)
    if [[ -n "${ip}" ]]; then
      echo "${ip}"; return
    fi
  fi
  echo "127.0.0.1"
}

SERVER_IP="$(detect_ip)"
echo "Using SERVER_IP=${SERVER_IP}"

# Random generators
random_b64() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32
  else
    head -c 32 /dev/urandom | base64
  fi
}

random_string() {
  openssl rand -hex 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-f0-9' | head -c 32
}

# Ensure apt and basic tools
ensure_prereqs() {
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "apt-get not found. This script targets Ubuntu/Debian."; exit 1
  fi
  sudo apt-get update -y || true
  sudo apt-get install -y ca-certificates curl gnupg || true
}

install_docker_if_needed() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker не найден. Подключаю официальный репозиторий и устанавливаю..."
    # Подготовка apt и ключей Docker
    sudo apt-get update -y || true
    sudo apt-get install -y ca-certificates curl gnupg || true
    sudo install -m 0755 -d /etc/apt/keyrings || true
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin || true
  fi

  # Если Docker поставился, но плагина compose нет — пробуем фолбэк
  if ! docker compose version >/dev/null 2>&1; then
    echo "Плагин docker compose недоступен. Ставлю standalone docker-compose v2..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
  fi

  # Запуск и добавление пользователя в группу docker (не критично, но полезно)
  sudo systemctl enable --now docker || true
  sudo usermod -aG docker "${SUDO_USER:-$USER}" || true
}

detect_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
  elif docker-compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
  else
    echo "Docker Compose не найден после установки."
    exit 1
  fi
}

ensure_compose_file() {
  sudo mkdir -p "$(dirname "$COMPOSE_FILE")"

  if [ -f "$COMPOSE_FILE" ]; then
    echo "Compose-файл найден: $COMPOSE_FILE"
    return
  fi

  echo "Скачиваю compose-файл из $COMPOSE_FILE_URL ..."
  tmp_file="$(mktemp)"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$COMPOSE_FILE_URL" -o "$tmp_file"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$tmp_file" "$COMPOSE_FILE_URL"
  else
    echo "Нужен curl или wget для скачивания COMPOSE_FILE_URL."
    exit 1
  fi
  sudo mv "$tmp_file" "$COMPOSE_FILE"

  if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Не удалось получить $COMPOSE_FILE."
    exit 1
  fi
}

ensure_env_file() {
  if [ -f "$ENV_FILE" ]; then
    echo ".env.prod найден: $ENV_FILE"
    return
  fi

  echo "Генерирую $ENV_FILE ..."
  POSTGRES_USER="${POSTGRES_USER:-hw}"
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(random_string)}"
  POSTGRES_DB="${POSTGRES_DB:-hw}"
  POSTGRES_PORT="${POSTGRES_PORT:-5432}"
  REDIS_PASSWORD="${REDIS_PASSWORD:-$(random_string)}"
  DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres_container:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"

  sudo tee "$ENV_FILE" >/dev/null <<EOF
# Autogenerated by install.sh
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_PORT=${POSTGRES_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}
DATABASE_URL=${DATABASE_URL}
EOF
}

prepare_dirs() {
  sudo mkdir -p "$INSTALL_DIR/storage/logs" "$INSTALL_DIR/storage/uploads"
  sudo chown -R 1001:65533 "$INSTALL_DIR/storage/logs" "$INSTALL_DIR/storage/uploads" 2>/dev/null || true
  sudo chmod -R 775 "$INSTALL_DIR/storage/logs" "$INSTALL_DIR/storage/uploads" || true
  sudo chmod -R 777 "$INSTALL_DIR/storage/logs" "$INSTALL_DIR/storage/uploads" || true
}

ensure_nginx_auth() {
  sudo mkdir -p "$NGINX_AUTH_DIR"
  if [ -f "$NGINX_AUTH_FILE" ]; then
    echo ".htpasswd найден: $NGINX_AUTH_FILE"
    return
  fi

  echo "Создаю .htpasswd (basic auth для nginx)..."
  HASH=$(openssl passwd -crypt "$BASIC_AUTH_PASSWORD")
  echo "${BASIC_AUTH_USER}:${HASH}" | sudo tee "$NGINX_AUTH_FILE" >/dev/null
}

compose_up() {
  install_docker_if_needed
  detect_compose_cmd
  ensure_compose_file
  ensure_env_file
  prepare_dirs
  ensure_nginx_auth

  echo "Pulling images and starting services..."
  sudo ${DOCKER_COMPOSE_CMD} -f "$COMPOSE_FILE" pull || true
  sudo ${DOCKER_COMPOSE_CMD} -f "$COMPOSE_FILE" up -d
}

main() {
  compose_up

  echo "Done."
  echo "Services should be accessible at:"
  echo "  Next.js:    http://${SERVER_IP}:3000"
  echo "  Nginx:      http://${SERVER_IP}:80"
  echo "  Prometheus: http://${SERVER_IP}:8080"
  echo "Check logs with: sudo ${DOCKER_COMPOSE_CMD} -f \"$COMPOSE_FILE\" logs -f"
  echo "------------------------------------------------------------"
  echo "Installed with:"
  echo "  SERVER_IP=${SERVER_IP}"
  echo "  INSTALL_DIR=${INSTALL_DIR}"
  echo "  COMPOSE_FILE=${COMPOSE_FILE}"
  echo "  ENV_FILE=${ENV_FILE}"
  echo "  NGINX_AUTH_FILE=${NGINX_AUTH_FILE}"
  echo "------------------------------------------------------------"
  echo "If you need to change SMTP or other settings, edit $ENV_FILE and restart:"
  echo "  ${DOCKER_COMPOSE_CMD} -f \"$COMPOSE_FILE\" down && ${DOCKER_COMPOSE_CMD} -f \"$COMPOSE_FILE\" up -d"
}

main "$@"