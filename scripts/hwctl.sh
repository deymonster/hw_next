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
  *) echo "Usage: $0 {up|restart|stop|down|logs|ps|pull}"; exit 1 ;;
esac