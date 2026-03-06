Предложенный план внедрения (по этапам)
Этап 1 — Контракт и криптомодель (сначала) [В РАБОТЕ]
[x] Зафиксировать API-контракт между licd и вашим licensing server:

POST /v1/activate (ИНН + install_id + fingerprint + версия продукта),

POST /v1/heartbeat,

POST /v1/deactivate (опционально),

POST /v1/reset (только админ/ручной режим).

Токен лицензии: лучше JWT/PASETO с Ed25519 подписью (подписывает только ваш сервер).

licd хранит токен, проверяет подпись публичным ключом.

поля токена: license_id, inn, max_agents, issued_at, expires_at, fingerprint_hash, activation_date, key_version.

Этап 2 — Fingerprint для Docker/Linux [ГОТОВО]
[x] Собирать fingerprint не из изменчивых полей контейнера, а из стабильных host-атрибутов:

/etc/machine-id,

DMI product_uuid/board_serial (если доступно),

CPU-id/модель,

ваша соль.

[x] Формула: fp = SHA256(canonical(host_id + cpu + salt)).

В БД хранить только hash fingerprint, не сырой набор.

Этап 3 — mTLS канал licd -> licensing server [ГОТОВО]
[x] В licd добавить отдельный HTTP client с:

client cert/key + pinned CA,

строгой проверкой SAN/CN,

timeout/retry/backoff + idempotency key (частично, требуется доработка retry).

[x] В конфиг licd добавить пути до cert/key/ca и URL сервера.

Этап 4 — Новый activation-flow по ИНН [ГОТОВО]
На странице лицензии:

[x] поле ИНН,

[x] кнопка “Активировать”,

[x] вывод статуса: активна/не активна/уже активирована, дата, куплено, занято, доступно.

licd:

[x] принимает ИНН,

[x] вычисляет fingerprint,

[x] вызывает ваш server по mTLS,

[x] сохраняет signed token + metadata в license_info.

Если уже активировано с тем же fingerprint — возвращать явный ответ “already_activated” + activated_at.

Этап 5 — Heartbeat (24ч) + grace period
Фоновый scheduler в licd раз в 24ч:

отправляет heartbeat (license_id, fingerprint_hash, used_slots),

получает статус (active/revoked/expired) и возможные новые лимиты.

Ввести grace window (например, 72ч): если сервер недоступен временно, не рубить работу мгновенно.

Этап 6 — Ограничение устройств и UX
Лимит сейчас уже есть — расширить:

единый ответ /license/status с полями: max_slots, used_slots, remaining_slots, status, activated_at, inn, expires_at.

Привести фронт/бэк к одному контракту (сейчас mismatch формата).

Этап 7 — Модель ручного переноса (ваш пункт 7)
Админ-операция reset на сервере лицензирования:

помечает старую активацию как reset_by_vendor,

разрешает новую активацию на новом fingerprint.

Обязательно аудит: кто, когда, по какой причине сбросил.

Этап 8 — Защита от подделки
Критичные параметры лицензии доверять только подписанному токену сервера.

Локальную БД считать недоверенной:

периодически валидировать подпись,

хранить token + signature,

при tamper detection → safe mode (read-only monitoring, без добавления устройств).

Убрать “seed active 50” из production миграций/флагов.

Приоритеты (что делать первым)
Спека API + токен + статусы (иначе будут переделки фронта/бэка).

mTLS клиент в licd + fingerprint модуль.

UI лицензии (ИНН + статусы + ошибки).

Heartbeat + revoke flow + grace period.

Hardening (tamper detection, аудит, rate limiting, idempotency).

Риски и рекомендации
Docker/VM могут менять часть HW-атрибутов → fingerprint делайте “устойчивым” (несколько источников + нормализация).

При полной оффлайн-работе продумайте политику: сколько дней без heartbeat разрешать.

Юридически/операционно важно заранее описать SLA ручного reset (ваш пункт 7), чтобы не блокировать клиентов.

===================================== Details ====================================

0. Текущее состояние (база для планирования)
   Что уже есть в проекте:

licd уже хранит лицензионные сущности: license_info, activations, audit_log; есть поля для hardware_hash, server_signature, last_heartbeat_at, customer_data (туда можно положить ИНН).

Лимит устройств реализован при активации (COUNT(\*) vs max_agents).

Повторная активация существующего agent_key сейчас обновляет запись, а не возвращает отдельный статус “already activated”.

Есть API /license/status, /license/activate, /license/activate-batch, /license/deactivate.

Страница лицензии пока без формы ИНН и без реального activation UI (только демо-блок).

licd слушает обычный HTTP (ListenAndServe), mTLS сейчас отсутствует; auth middleware фактически пустой.

Есть риск: seed активной лицензии на 50 уже в миграциях (для прод нужно убрать/ограничить).

Есть несовместимость контракта статуса: фронт ждёт max_agents/active_licensed/remaining, а licd отдаёт max_slots/used_slots/remaining_slots

Этап 1 — Зафиксировать единый контракт лицензирования (обязательно первым)
Что сделать
Описать API между licd и вашим Licensing Server:

POST /v1/activate

POST /v1/heartbeat

POST /v1/status

POST /v1/reset (админ-only)

Описать API между фронтом/основным сервисом и licd:

POST /license/activate-by-inn

GET /license/status

Зафиксировать единый JSON-формат статуса и убрать текущий mismatch полей.

Definition of Done
Есть спецификация (OpenAPI/Markdown) со статус-кодами и error-кодами.

Описаны идемпотентность и повторные запросы (already_activated).

Тесты этапа
Contract tests (schema validation) на все ответы.

Негативные: пустой ИНН, невалидный ИНН, неизвестный ИНН, revoked/expired.

Этап 2 — Модель токена и защита от подделки
Что сделать
Ввести подписанный license token (рекомендую Ed25519: компактно и быстро).

Токен должен включать:

license_id, inn, max_agents, issued_at, expires_at,

fingerprint_hash, activation_date, key_version, status.

licd хранит токен и проверяет подпись публичным ключом (локально, без запроса наружу).

Любые лимиты/статусы бать из проверенного токена, а не доверять локальным правкам БД.

Definition of Done
Нельзя изменить max_agents в БД и продолжить работу без fail-safe.

При невалидной подписи licd переходит в ограниченный режим.

Тесты этапа
Unit: verify signature valid/invalid/tampered.

Unit: expired token / not-before.

Integration: подмена max_agents в БД -> licd детектит tamper.

Этап 3 — Fingerprint для Docker/Linux
Что сделать
Реализовать модуль fingerprint в licd:

источник 1: /etc/machine-id,

источник 2: DMI UUID/serial (если доступно),

источник 3: CPU-модель/ID,

ваша соль.

Нормализация входов и вычисление SHA-256.

В хранилище писать только hash fingerprint.

Добавить версионирование алгоритма fingerprint (fp_version), чтобы можно было мигрировать.

Definition of Done
Fingerprint стабилен между рестартами контейнера на одном хосте.

Fingerprint меняется при переносе на другое железо (в нормальном случае).

Тесты этапа
Unit: одинаковый вход => одинаковый hash.

Unit: изменение одного источника => другой hash.

Integration (docker): restart container -> hash тот же.

Integration (mock host source): смена host id -> hash меняется.

Этап 4 — mTLS канал licd -> Licensing Server
Что сделать
Добавить в licd отдельный HTTP client c:

client cert/key,

trust CA (пиннинг вашей CA),

strict SAN hostname check.

В конфиг добавить:

LIC_SERVER_URL, MTLS_CERT_FILE, MTLS_KEY_FILE, MTLS_CA_FILE, TLS_SERVER_NAME.

Включить retry/backoff + idempotency key для activate/heartbeat.

Логировать причину TLS ошибок (без утечки секретов).

Definition of Done
Без валидного клиентского сертификата запрос не проходит.

При неверном server cert — отказ (не fallback на insecure).

Тесты этапа
Integration:

valid mTLS => 200,

invalid client cert => 401/403,

unknown CA => handshake fail,

wrong SAN => handshake fail.

Chaos: временный таймаут/500 + retry policy.

Этап 5 — Activation-flow по ИНН (ваши пункты 1–6)
Что сделать
Новый endpoint в licd:

принимает ИНН,

строит fingerprint,

вызывает licensing server по mTLS,

сохраняет token + метаданные.

Обработать сценарии:

activated (новая активация),

already_activated (+ дата первой активации),

payment_not_found,

license_exhausted,

revoked/expired.

Отдавать в основной сервис нормализованный статус для UI.

Definition of Done
Повторная активация возвращает already_activated и activated_at.

Вся логика статусов едина между backend и frontend.

Тесты этапа
Integration: activation success.

Integration: same INN + same fp => already_activated + date.

Integration: same INN + different fp => transfer_required/manual_reset_required.

API tests на коды и payload.

Этап 6 — Heartbeat каждые 24 часа (ваш пункт 8)
Что сделать
Scheduler внутри licd (или cron-процесс) раз в 24 часа:

отправляет license_id, fingerprint_hash, used_slots, version.

Обновляет локально:

last_heartbeat_at,

статус лицензии (active/revoked/expired),

возможно обновление лимита (если разрешите такое поведение).

Ввести grace period (например, 72 часа), чтобы не падать при кратковременном оффлайне.

Definition of Done
Heartbeat реально выполняется по расписанию.

При revoked система блокирует новые активации устройств.

Тесты этапа
Unit: scheduler interval, next-run logic.

Integration: heartbeat success/fail/retry.

Integration: revoked response => запрет добавления устройств.

Этап 7 — Ограничение числа устройств + отображение куплено/доступно (ваш пункт 9)
Что сделать
Привести /license/status к финальной модели:

max_slots, used_slots, remaining_slots, status, expires_at, activated_at, inn.

На добавлении устройств оставляем текущую проверку лимитов, но источник лимита — проверенный license token.

На UI лицензии и на экранах добавления устройств показывать:

куплено / занято / доступно,

понятную ошибку при превышении.

Definition of Done
Нельзя добавить устройство сверх лимита.

UI показывает корректные числа и не “ломается” из-за несовместимого JSON.

Тесты этапа
Backend integration: limit boundary (N, N+1).

Frontend e2e: отображение счетчиков и ошибок.

Regression: batch activation и single activation.

Этап 8 — Ручной перенос лицензии (ваш пункт 7)
Что сделать
На licensing server добавить админ-операцию reset activation:

по license_id/ИНН,

с аудитом who/when/reason.

После reset новый fingerprint может активироваться.

В licd корректно обрабатывать ответ “manual reset completed”.

Definition of Done
Старый fingerprint больше не валиден после reset.

Новый fingerprint успешно активируется.

Тесты этапа
Integration: old fp denied после reset.

Integration: new fp activation success.

Audit log tests.

Этап 9
Что именно строим в Этапе 9 (Scope)
Новый сервис: license-admin-web (frontend) + API слоя licensing server (если его endpoints ещё не готовы).
Пользователи: только вы/ваша команда (vendor admins).
Основные разделы UI:

Organizations (клиенты)

Licenses (создание/редактирование/статусы)

Activations (поиск по ИНН/license_id/fingerprint)

Transfer Requests / Manual Reset

Audit Log

Security & Key Versions (опционально v1)

Этап 10 — Hardening (ваш пункт 10)
Что сделать
Убрать debug-логи и привести к структурированному логированию.

Включить rate limiting для license API.

Добавить request signing/idempotency на чувствительных endpoint’ах.

Защитить секреты и ключи:

только файловые секреты/secret store,

ротация ключей,

key_version поддержка.

Убрать/ограничить seed “active 50” в прод-окружении.

Definition of Done
Базовые атаки (подмена БД, replay, unauth TLS) не позволяют обойти лимиты.

Есть runbook по инцидентам (revocation/reset/key rotation).

Тесты этапа
Security tests: replay, tamper, invalid cert.

Pen-test checklist (минимум автоматизируемая часть).

Load tests на license endpoints.

Рекомендуемая последовательность релизов
Контракт + токен-модель.

Fingerprint + mTLS.

Activation by INN backend.

Heartbeat + revoke/reset flows.

Frontend.

Hardening + нагрузка + документация эксплуатации.
