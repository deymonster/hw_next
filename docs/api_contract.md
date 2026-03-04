# Спецификация API лицензирования и протокола

## Обзор

Этот документ определяет протокол взаимодействия между:

1. **licd** (License Daemon) и **Licensing Server** (Сервер вендора).
2. **Frontend/Main App** и **licd** (Локальный демон).

## 1. Криптомодель: Токен Лицензии

Токен лицензии является источником правды для лимитов и возможностей.

### Формат

- **Стандарт**: JWT (JSON Web Token)
- **Алгоритм подписи**: Ed25519 (Edwards-curve Digital Signature Algorithm)
- **Издатель (Issuer)**: Licensing Server (владеет приватным ключом)
- **Проверяющий (Verifier)**: licd (владеет публичным ключом)

### Payload Токена (Claims)

JSON объект, подписанный сервером.

```json
{
	"lid": "550e8400-e29b-41d4-a716-446655440000", // license_id (UUID)
	"inn": "1234567890", // ИНН клиента
	"max": 100, // max_agents (слоты)
	"iat": 1715000000, // Issued At (Unix timestamp)
	"exp": 1746536000, // Expires At (Unix timestamp)
	"fph": "a3b9...", // Fingerprint Hash (SHA-256)
	"act": "2024-05-01T12:00:00Z", // Дата активации (ISO8601)
	"ver": 1, // Версия ключа (для ротации)
	"sts": "active" // Статус: active, trial, expired
}
```

## 2. API: licd -> Licensing Server (Вендор)

_Коммуникация будет защищена mTLS на Этапе 3._

### POST /v1/activate

Активирует лицензию для конкретного слепка оборудования (fingerprint).

**Запрос**:

```json
{
	"inn": "1234567890",
	"fingerprint": "sha256-hash-of-hw-id",
	"install_id": "uuid-v4-generated-on-install",
	"version": "1.0.0",
	"hostname": "customer-server-01"
}
```

**Ответ (200 OK)**:

```json
{
	"token": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
	"status": "active",
	"activated_at": "2024-05-06T12:00:00Z"
}
```

**Ответ (409 Conflict)**:

```json
{
	"code": "already_activated",
	"message": "License already activated on this fingerprint",
	"activated_at": "2024-01-01T00:00:00Z"
}
```

**Ответ (403 Forbidden)**:

- `transfer_required` (несовпадение fingerprint)
- `revoked`
- `expired`

### POST /v1/heartbeat

Периодическая проверка (каждые 24ч) для валидации статуса.

**Запрос**:

```json
{
	"license_id": "uuid",
	"fingerprint": "hash",
	"used_slots": 45
}
```

**Ответ (200 OK)**:

```json
{
	"status": "active",
	"token": "new-token..." // Опционально, если нужно обновить токен
}
```

### POST /v1/reset (Только админ/ручной режим)

Сброс активации для переноса на новое оборудование.

**Запрос**:

```json
{
	"license_id": "uuid",
	"reason": "Hardware failure / Migration"
}
```

## 3. API: Frontend -> licd (Локальный)

### POST /license/activate-by-inn

Запускает процесс активации из UI.

**Запрос**:

```json
{
	"inn": "1234567890"
}
```

**Ответ**:
Проксирует статус от Licensing Server, но в нормализованном виде.

```json
{
  "success": true,
  "status": "active",
  "data": { ... }
}
```

### GET /license/status

Единый ответ статуса для UI.

**Ответ**:

```json
{
	"max_slots": 100,
	"used_slots": 45,
	"remaining_slots": 55,
	"status": "active", // active, expired, revoked, mismatch
	"inn": "1234567890",
	"activated_at": "2024-05-01T...",
	"expires_at": "2025-05-01T..."
}
```

# Licensing API Contract & Protocol Specification

## Overview

This document defines the communication protocol between:

1. **licd** (License Daemon) and **Licensing Server** (Vendor).
2. **Frontend/Main App** and **licd** (Customer local).

## 1. Crypto Model: License Token

The license token is the source of truth for limits and capabilities.

### Format

- **Standard**: PASETO v4.public (Recommended) or JWT (EdDSA)
- **Signature Algorithm**: Ed25519 (Edwards-curve Digital Signature Algorithm)
- **Issuer**: Licensing Server (holds private key)
- **Verifier**: licd (holds public key)

### Token Payload (Claims)

The token payload is a JSON object signed by the server.

```json
{
	"lid": "550e8400-e29b-41d4-a716-446655440000", // license_id (UUID)
	"inn": "1234567890", // Customer INN
	"max": 100, // max_agents (slots)
	"iat": 1715000000, // Issued At (Unix timestamp)
	"exp": 1746536000, // Expires At (Unix timestamp)
	"fph": "a3b9...", // Fingerprint Hash (SHA-256 of hardware ID)
	"act": "2024-05-01T12:00:00Z", // Activation Date (ISO8601)
	"ver": 1, // Key Version (for rotation)
	"sts": "active" // Status: active, trial, expired
}
```

## 2. API: licd -> Licensing Server (Vendor)

_Communication will be secured via mTLS in Stage 3._

### POST /v1/activate

Activates a license for a specific hardware fingerprint.

**Request**:

```json
{
	"inn": "1234567890",
	"fingerprint": "sha256-hash-of-hw-id",
	"install_id": "uuid-v4-generated-on-install",
	"version": "1.0.0",
	"hostname": "customer-server-01"
}
```

**Response (200 OK)**:

```json
{
	"token": "v4.public.eyJ...",
	"status": "active",
	"activated_at": "2024-05-06T12:00:00Z"
}
```

**Response (409 Conflict)**:

```json
{
	"code": "already_activated",
	"message": "License already activated on this fingerprint",
	"activated_at": "2024-01-01T00:00:00Z"
}
```

**Response (403 Forbidden)**:

- `transfer_required` (fingerprint mismatch)
- `revoked`
- `expired`

### POST /v1/heartbeat

Periodic check (every 24h) to validate status and update metrics.

**Request**:

```json
{
	"license_id": "uuid",
	"fingerprint": "hash",
	"used_slots": 45
}
```

**Response (200 OK)**:

```json
{
	"status": "active",
	"token": "new-token..." // Optional, returned if token needs refresh/rotation
}
```

### POST /v1/reset (Admin/Manual Only)

Resets activation to allow transfer to new hardware.

**Request**:

```json
{
	"license_id": "uuid",
	"reason": "Hardware failure / Migration"
}
```

## 3. API: Frontend -> licd (Local)

### POST /license/activate-by-inn

Initiates the activation flow from the UI.

**Request**:

```json
{
	"inn": "1234567890"
}
```

**Response**:
Proxies the status from the Licensing Server, but normalized.

```json
{
  "success": true,
  "status": "active",
  "data": { ... }
}
```

### GET /license/status

Unified status response for the UI.

**Response**:

```json
{
	"max_slots": 100,
	"used_slots": 45,
	"remaining_slots": 55,
	"status": "active", // active, expired, revoked, mismatch
	"inn": "1234567890",
	"activated_at": "2024-05-01T...",
	"expires_at": "2025-05-01T..."
}
```
