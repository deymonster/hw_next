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
