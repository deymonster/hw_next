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

## Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and configure:
    - Database credentials
    - Prometheus settings
    - SMTP configuration
    - Telegram bot token
    - Redis configuration

## Detailed Installation Guide

### System Requirements

1. Operating System:
    - Linux (Ubuntu 20.04+ recommended)
    - Windows 10/11 with WSL2
    - macOS 12+

### Installing Prerequisites

1. **Node.js Installation**:

    ```bash
    # Using Ubuntu
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # Verify installation
    node --version  # Should be 20.x or higher
    npm --version   # Should be 10.x or higher
    ```

2. **Yarn Installation**:

    ```bash
    # Install Yarn globally
    sudo npm install -g yarn

    # Verify installation
    yarn --version  # Should be 1.22.x or higher
    ```

3. **Docker Installation**:

    ```bash
    # Install Docker
    sudo apt-get update
    sudo apt-get install -y docker.io

    # Install Docker Compose
    sudo apt-get install -y docker-compose

    # Add your user to docker group
    sudo usermod -aG docker $USER
    newgrp docker

    # Verify installation
    docker --version
    docker-compose --version
    ```

### Project Setup

1. **Clone and Configure**:

    ```bash
    # Clone repository
    git clone <repository-url>
    cd hw-monitor

    # Copy environment file
    cp .env.example .env
    ```

2. **Configure Environment Variables**:
   Edit `.env` file and set up:

    - `DATABASE_URL`: PostgreSQL connection string
    - `REDIS_URL`: Redis connection string
    - `NEXT_PUBLIC_API_URL`: API endpoint
    - `JWT_SECRET`: Secret key for JWT
    - Other required variables

3. **Start Docker Services**:

    ```bash
    # Start all required services
    docker-compose up -d

    # Verify services are running
    docker ps
    ```

4. **Install Dependencies and Initialize Database**:

    ```bash
    # Install project dependencies
    yarn install

    # Generate Prisma client
    yarn prisma generate

    # Run database migrations
    yarn prisma migrate dev
    ```

5. **Start Development Server**:

    ```bash
    # Start the development server
    yarn dev
    ```

    The application will be available at `http://localhost:3000`

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
