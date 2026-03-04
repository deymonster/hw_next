Полный технический backlog (для агента)
EPIC 0 — Product/Protocol Design (обязательный foundation)
Story 0.1 — Финальная спецификация лицензирования
Задачи

Зафиксировать бизнес-статусы: active, already_activated, payment_not_found, expired, revoked, transfer_required, grace.

Описать API-контракты:

licd -> licensing server (activate/heartbeat/status),

main app -> licd,

admin frontend -> licensing server.

Описать error-codes и idempotency policy.

Тесты

Contract tests по JSON schema на все endpoint’ы.

Snapshot tests примеров payload.

DoD

OpenAPI + ADR утверждены, все команды разработки работают по одной схеме.

EPIC 1 — Licensing Server Backend (ядро)
Story 1.1 — Домен и БД лицензирования
Задачи

Таблицы: organizations, licenses, license_activations, heartbeats, transfer_requests, audit_events, key_versions.

Индексы по inn, license_id, fingerprint_hash, status, created_at.

Миграции + rollback.

Тесты

Migration tests (up/down).

Integrity tests (FK/unique/check constraints).

DoD

БД выдерживает полный lifecycle лицензии и переноса.

Story 1.2 — API: Issue/Activate/Status/Heartbeat/Revoke
Задачи

POST /v1/licenses/issue

POST /v1/licenses/activate (INN + fingerprint)

POST /v1/licenses/heartbeat

GET /v1/licenses/{id}/status

POST /v1/licenses/{id}/revoke

Идемпотентность activate/heartbeat через idempotency-key.

Тесты

Integration tests на happy + negative paths.

Concurrency tests (двойная активация в гонке).

Idempotency tests.

DoD

Сервер корректно обрабатывает все базовые сценарии лицензирования.

Story 1.3 — Подписанные токены лицензии
Задачи

Выпуск signed token (Ed25519/JWT/PASETO).

Поля: license_id, inn, max_agents, expires_at, fingerprint_hash, activation_date, key_version.

Endpoint для публичного ключа/ключей.

Тесты

Unit: verify valid/invalid/tampered signature.

Integration: старый/новый key_version.

Expiration tests.

DoD

Лимиты и статус доверяются только подписанному токену.

Story 1.4 — Ручной перенос (reset activation)
Задачи

POST /v1/licenses/{id}/transfer/reset

Инвалидация старого fingerprint.

Возможность one-time activation window для нового fingerprint.

Полный audit trail (who/why/when/ticket).

Тесты

Integration: старый fp отклоняется, новый активируется.

RBAC tests (неавторизованный reset запрещён).

Idempotency повторного reset.

DoD

Операция ручного переноса работает предсказуемо и безопасно.

EPIC 2 — licd (клиентский daemon на стороне заказчика)
Story 2.1 — Fingerprint-модуль для Linux host в Docker
Задачи

Сбор стабильных признаков хоста.

Нормализация + SHA-256 + fp_version.

Хранение hash в локальной БД.

Тесты

Unit: стабильность/изменяемость hash.

Integration в контейнере: restart same host => same hash.

DoD

Fingerprint устойчив и годится для привязки лицензии.

Story 2.2 — mTLS-клиент licd -> licensing server
Задачи

Конфиг сертификатов/CA/server-name.

Strict TLS verification (без insecure fallback).

Retry/backoff/timeouts/circuit breaker.

Тесты

mTLS integration: valid cert OK, invalid cert fail, wrong CA fail.

Timeout/retry behavior tests.

DoD

Все внешние лицензирующие вызовы идут только по защищённому каналу.

Story 2.3 — Активация по ИНН в licd
Задачи

Новый endpoint в licd: POST /license/activate-by-inn.

Логика:

принять ИНН,

собрать fingerprint,

вызвать licensing server,

сохранить token + status локально.

Ответы: activated, already_activated, transfer_required, etc.

Тесты

Integration tests всех статусных сценариев.

Contract tests с основным сервисом.

DoD

licd умеет активировать лицензию по ИНН через licensing server.

Story 2.4 — Heartbeat job (24h + grace)
Задачи

Планировщик heartbeat каждые 24ч.

Обновление last_heartbeat_at, статуса и лимитов.

Grace mode при временной недоступности сервера.

Тесты

Scheduler tests.

Integration: revoke на heartbeat блокирует новые активации.

Grace window tests.

DoD

Периодическая валидация лицензии работает автономно и устойчиво.

Story 2.5 — Enforcement: лимит устройств и защита от tamper
Задачи

Источник лимита — верифицированный license token.

Проверка подписи токена перед критичными операциями.

При tamper detection — safe mode + событие в аудит.

Тесты

Integration: подмена локальных данных не повышает лимит.

Tamper tests.

Regression для batch activation.

DoD

Лимит невозможно увеличить локальной правкой БД.

EPIC 3 — Основной продукт (ваш текущий сервис)
Story 3.1 — Интеграция с licd API
Задачи

Выровнять контракт полей статуса (исправить mismatch в getLicenseStatus).

Добавить вызовы активации по ИНН и отображение статусов.

Обработка ошибок по коду причины.

Тесты

Unit: parser/validator payload.

Integration: действия с licd mock.

E2E: успешная активация/превышение лимита/already activated.

DoD

Основной сервис корректно работает с новым API licd.

Story 3.2 — UI лицензии в основном продукте (клиентский)
Задачи

Форма ввода ИНН.

Карточка статуса: куплено/занято/доступно, дата активации, heartbeat.

UX для сценариев переноса (с инструкцией обратиться к вам).

Тесты

UI/e2e на все статусы.

i18n tests RU/EN.

Visual regression.

DoD

Пользователь может активировать и понять текущее состояние лицензии.

EPIC 4 — Admin Frontend для Licensing Server (ваш “этап 9”)
Story 4.1 — Auth + RBAC
Роли: owner, support, viewer.

Критические операции (revoke/reset) только для нужных ролей.

Тесты: auth/rbac integration, forbidden tests.

Story 4.2 — Organizations и Licenses CRUD
Создание клиента по ИНН.

Выпуск/изменение/продление/отзыв лицензии.

Отображение текущего лимита и истории.

Тесты: e2e CRUD + contract.

Story 4.3 — Activations мониторинг
Реестр активаций + фильтры + карточка.

Видно old/new fingerprint и heartbeat.

Тесты: list/filter/perf.

Story 4.4 — Manual transfer workflow
Создание/обработка заявок переноса.

Кнопка reset activation.

Журнал действий.

Тесты: workflow + idempotency + audit completeness.

EPIC 5 — Security/Compliance/Operations
Story 5.1 — Аудит и неизменяемый журнал
Append-only audit events.

Поиск и экспорт.

Тесты: audit emission per critical action.

Story 5.2 — Key management и ротация
key_version lifecycle.

Параллельная валидация старых токенов на переходном периоде.

Тесты: rollover tests.

Story 5.3 — Rate limiting, anti-replay, observability
Limits на чувствительные endpoint’ы.

Idempotency + nonce/replay protection.

Метрики/алерты: activation errors, heartbeat stale, reset rate.

Тесты: load tests + replay tests.

EPIC 6 — QA/CI/CD/Release
Story 6.1 — Полная тестовая пирамида
Unit, integration, e2e, contract, security smoke.

Тест-матрица по всем статусам лицензии.

Story 6.2 — CI gates и релизный runbook
Lint/typecheck/tests required.

План rollback.

Runbook по ручному переносу/инцидентам.

Приоритет и порядок внедрения (рекомендуемый)
EPIC 0 (спека)

EPIC 1 (ядро licensing server)

EPIC 2 (licd: mTLS + activate/heartbeat + enforcement)

EPIC 3 (интеграция в основной продукт)

EPIC 4 (admin frontend для вас)

EPIC 5/6 (hardening + ops)
