# Hardware Monitoring System

A comprehensive hardware monitoring solution for local network workstations built with Next.js, Prometheus, and Go agents.

## Overview

This system allows you to monitor multiple workstations in your local network, collecting and analyzing hardware metrics in real-time. It features automatic device discovery, metric collection, alerting, and a user-friendly dashboard.

## Features

### Device Management

- Automatic network scanning for device discovery
- Real-time hardware metrics collection
- Dynamic Prometheus target configuration
- Device status monitoring

### Metrics Monitoring

- CPU usage and temperature
- RAM utilization
- Storage capacity and usage
- GPU metrics
- BIOS and motherboard information
- Running processes list

### User System

- User authentication and authorization
- Role-based access control (Admin/User)
- Password recovery system
- Email notifications

### Interface

- Modern, responsive dashboard
- Dark/Light theme support
- Multilingual support (English/Russian)
- Real-time metric graphs
- Alert notifications

### Alerting System

- Configurable alert thresholds
- Multiple notification channels:
    - Telegram notifications
    - Email alerts
- Custom alert rules for different metrics

## Technology Stack

### Frontend

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Recharts for graphs
- Next-Auth for authentication

### Backend

- Next.js API routes
- Prisma ORM
- PostgreSQL database
- Redis for caching
- Node.js

### Monitoring

- Prometheus for metrics collection
- AlertManager for alert handling
- Custom Go agents for workstations
- Nginx as reverse proxy

## Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis
- Prometheus
- Docker and Docker Compose
- Go (for building agents)
- Yarn package manager

## Quick Start (Docker)

The easiest way to bootstrap a local environment is to run the helper script:

```bash
bash scripts/setup-local.sh --start-next
```

What the script does:

- validates that Docker is available (Docker Desktop on Windows/macOS, or Docker Engine on Linux)
- generates `.env` with sensible development defaults (random secrets, localhost URLs)
- prepares required folders (`storage/logs`, `storage/uploads`, `nginx/auth/.htpasswd`)
- builds/starts all Docker Compose services from `docker-compose.dev.yml`
- installs Node dependencies, generates Prisma client, runs `prisma migrate deploy`
- optionally starts the Next.js dev server (`--start-next` flag)

Useful flags:

- `--host <hostname>` – replace `localhost` in generated URLs (useful when testing from another device)
- `--admin-email <email>` – seed admin email
- `--skip-yarn` – skip `yarn install`/migrations (if you manage Node inside containers)
- omit `--start-next` if you prefer to run `yarn dev` manually

After the script finishes the services are exposed on:

| Service      | URL/Port              |
| ------------ | --------------------- |
| Next.js UI   | http://localhost:3000 |
| PostgreSQL   | 127.0.0.1:5432        |
| Redis        | 127.0.0.1:6379        |
| Prometheus   | http://localhost:9090 |
| Alertmanager | http://localhost:9093 |
| Nginx proxy  | http://localhost:8080 |
| File storage | http://localhost:8081 |
| LICD service | http://localhost:8082 |

The script creates/updates `.env`. If you customise values later, simply re-run the script to merge changes.

### Required environment variables

Most of the application logic expects the following keys (the script fills them automatically):

- `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SERVER_IP`, `NEXT_PUBLIC_URL`
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_STORAGE_URL`, `NEXT_PUBLIC_UPLOADS_BASE_URL`, `NEXT_PUBLIC_MEDIA_URL`
- PostgreSQL block: `POSTGRES_*`, `DATABASE_URL`
- Redis block: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_URL`
- Prometheus block: `PROMETHEUS_PROXY_URL`, `PROMETHEUS_USERNAME`, `PROMETHEUS_AUTH_PASSWORD`, `PROMETHEUS_TARGETS_PATH`
- Admin credentials: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`
- Agent shared key: `AGENT_HANDSHAKE_KEY`
- Encryption/auth secrets: `ENCRYPTION_KEY`, `NEXTAUTH_SECRET`
- SMTP placeholders (`SMTP_HOST`, `SMTP_PORT`, etc.) – they must exist even if you are not sending emails locally

### Manual Setup (alternative)

If you prefer not to run the script, follow these steps:

1. **Install prerequisites**

    - Docker (with Compose plugin)
    - Node.js 18+ and Yarn (for running Next.js locally)

2. **Clone and configure**

    ```bash
    git clone <repository-url>
    cd hw-monitor
    cp .env.example .env
    ```

3. **Edit `.env`**

    - set the variables listed above
    - create `storage/logs`, `storage/uploads`, and `nginx/auth/.htpasswd` (use `openssl passwd -apr1 <password>` to populate the file)

4. **Start Docker services**

    ```bash
    docker compose -f docker-compose.dev.yml up -d --build
    ```

5. **Install dependencies and apply migrations**

    ```bash
    yarn install
    yarn prisma generate
    yarn prisma migrate deploy
    ```

6. **Start Next.js**

    ```bash
    yarn dev --hostname 0.0.0.0
    ```

    The UI will be available at `http://localhost:3000`.

### Troubleshooting

1. **Docker Permission Issues**:

    ```bash
    sudo chmod 666 /var/run/docker.sock
    ```

2. **Port Conflicts**:

    - Check if ports 3000, 5432, 6379, 8080, 9090 are available
    - Modify docker-compose.yml if needed

3. **Database Connection Issues**:

    - Verify PostgreSQL is running: `docker ps | grep postgres`
    - Check database logs: `docker logs postgres_container`

4. **Redis Connection Issues**:
    - Verify Redis is running: `docker ps | grep redis`
    - Check Redis logs: `docker logs redis_container`

### Development Tools

1. **Running TypeScript Files Directly**:

    ```bash
    # Install tsx globally (if not already installed)
    yarn global add tsx

    # Run TypeScript files directly
    tsx path/to/file.ts

    # For test-alertmanager.ts specifically
    tsx test-tools/test-alertmanager.ts
    ```

### Production Deployment

For production deployment, additional steps are required:

1. **Build the Application**:

    ```bash
    yarn build
    ```

2. **Start Production Server**:

    ```bash
    yarn start
    ```

3. **Configure Nginx** (recommended):
    - Set up SSL certificates
    - Configure reverse proxy
    - Enable gzip compression

### Quick Production Setup (Installer)

To bootstrap a clean Ubuntu/Debian server:

```bash
bash scripts/install.sh --server-ip 192.168.1.10 --admin-email admin@example.com
```

This installs Docker/Compose, generates `.env.prod`, creates storage dirs, and starts services. Optional flags: `--admin-password`, `--telegram-bot-token`.

### Quick start (Ubuntu/Debian)

```bash
bash scripts/install.sh --server-ip <IP> --admin-email <email>
```

- `--server-ip` — server public IP or domain
- `--admin-email` — admin contact email

### Release & Docker Tags (CI/CD)

Docker images are built and pushed only when you push specific git tags. Regular commits to branches do not trigger the build.

- Tag format: <service>-v<semver>
- Allowed values for <service>:
    - hw-monitor — main Next.js service
    - hw-monitor-licd — licensing service (LICD)
    - hw-monitor-nginx-combined — combined Nginx (proxy + storage)
- Semver:
    - X.Y.Z-alpha — prerelease stream
    - X.Y.Z — stable release

What CI does on tag push:

- Builds and publishes exactly the image for the specified service
- Publishes two Docker tags:
    - Alias tag: alpha (for -alpha) or latest (for stable)
    - Version tag: <service>-vX.Y.Z[-alpha[.N]]
- For X.Y.Z-alpha without numeric suffix, CI auto-increments the build number .N based on tag history.
  Example: git tag hw-monitor-v1.0.0-alpha → Docker tags:
    - deymonster/hw-monitor:alpha
    - deymonster/hw-monitor:hw-monitor-v1.0.0-alpha.3

Service-to-Dockerfile mapping:

- hw-monitor → Dockerfile (context .)
- hw-monitor-licd → licd/Dockerfile (context ./licd)
- hw-monitor-nginx-combined → Dockerfile.nginx-combined (context .)

Examples (create and push tags):

- Next.js (alpha):
    ```bash
    git tag hw-monitor-v1.0.0-alpha
    git push origin hw-monitor-v1.0.0-alpha
    ```
- Next.js (stable):
    ```bash
    git tag hw-monitor-v1.0.0
    git push origin hw-monitor-v1.0.0
    ```
- LICD (alpha):
    ```bash
    git tag hw-monitor-licd-v1.0.0-alpha
    git push origin hw-monitor-licd-v1.0.0-alpha
    ```
- Nginx Combined (alpha):
    ```bash
    git tag hw-monitor-nginx-combined-v1.0.0-alpha
    git push origin hw-monitor-nginx-combined-v1.0.0-alpha
    ```

Notes:

- Tags like v1.0.1 (without a service name) do NOT trigger Docker builds — use service tags as shown above.
- If you need a fixed alpha build number, include it in the git tag: hw-monitor-v1.0.0-alpha.7

## SMTP Configuration

Registration and email notifications require SMTP settings in `.env.prod`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASSWORD=your-password
SMTP_FROM="HW Monitor <no-reply@example.com>"
SMTP_SECURE=false
SMTP_TLS=true
```

## Installation

```bash
# Install dependencies
yarn install

# Generate Prisma client
yarn prisma generate

# Run database migrations
yarn prisma migrate dev

# Start development server
yarn dev
```
