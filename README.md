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
