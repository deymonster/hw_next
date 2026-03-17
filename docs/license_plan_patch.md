Цель: сделать безопасную и стабильную схему лицензирования для агента.

1. licd доверяет только встроенному CA (пиннинг).
2. licd проходит bootstrap через POST /v1/register без client cert.
3. После регистрации licd получает client cert + public key.
4. Все рабочие endpoint’ы (/v1/activate, позже /v1/heartbeat) принимаются lic-server только по mTLS.
5. lic-server принимает только валидных клиентов licd, а не “любой сертификат от этой CA”.

Текущие проблемные места подтверждены кодом:

на сервере client cert пока не обязателен (VerifyClientCertIfGiven).
в licd есть CSR flow с сохранением cert/key и reload клиента.
в licd trust сейчас идёт из embedded CA (это правильно для pinning идеи).
/v1/register и /v1/activate уже есть, но без endpoint-level mTLS политики.

Готовый план (разбивка на подзадачи)
PHASE 0 — Базовая фиксация и логирование (обязательно сначала)
Задача 0.1
В licd добавить явные логи:

- печатать факт загрузки client cert/key (успех/ошибка) в NewLicenseClient.
- печатать путь cert/key и причину, если пара не загружена.

Почему: сейчас ошибки загрузки cert/key глотаются, из-за этого трудно понять runtime-состояние.

Задача 0.2
В licd на старте логировать:

- LICENSE_SERVER_URL, SKIP_TLS_VERIFY, CERT_PATH, KEY_PATH, CA_PATH.
  DoD: в логах при старте есть полный конфиг mTLS-клиента.

PHASE 1 — Разделить bootstrap и защищённые endpoint’ы на lic-server
Задача 1.1
Оставить /v1/register доступным без client cert (bootstrap).

Задача 1.2
Для /v1/activate (и будущего /v1/heartbeat) ввести middleware:

- отказ, если r.TLS == nil,
- отказ, если len(r.TLS.PeerCertificates) == 0,
- отказ, если len(r.TLS.VerifiedChains) == 0.

Задача 1.3
Проверять профиль клиентского сертификата:

- Subject.CommonName == "licd-client" (или agreed pattern),
- ExtKeyUsage содержит ClientAuth (доп. защита на уровне проверки).

Важно: CA signer уже выдаёт client-auth cert, это хорошо.

DoD PHASE 1:

- POST /v1/register работает без cert.
- POST /v1/activate без cert -> 401/403.
- POST /v1/activate с cert -> проходит.

PHASE 2 — Связать client cert с конкретной лицензией/ИНН (чтобы не любой cert)
Задача 2.1 — Миграция БД lic-server
Добавить таблицу (например client_cert_bindings):

- id
- inn
- cert_serial
- cert_fingerprint_sha256
- subject_cn
- issued_at
- expires_at
- status (active|revoked)
- индексы: cert_serial, cert_fingerprint_sha256, inn,status

Задача 2.2 — Сохранение binding при register
После подписи CSR:

- извлечь serial/fingerprint выданного cert,
- сохранить связку inn <-> cert.

Задача 2.3 — Проверка binding на activate
На activate:

- взять cert из r.TLS.PeerCertificates[0],
- найти binding в БД,
- убедиться, что status=active и binding относится к переданному inn.

DoD PHASE 2:

- cert, выданный для INN_A, не может активировать INN_B.
- revoke binding блокирует activate.

PHASE 3 — Привести licd конфиг к чистой модели pinning
Задача 3.1
Оставить trust только на embedded CA (как и задумано).

- Убрать из прод-конфига CA_PATH как вводящий в заблуждение параметр (если не используется как fallback).

Задача 3.2
Оставить обязательные env для licd:

- LICENSE_SERVER_URL
- CERT_PATH
- KEY_PATH
- STORAGE_FILE_PATH
- FINGERPRINT_SALT
- (опц.) LICENSE_PUBLIC_KEY только если нужен override.

Задача 3.3
В production запретить SKIP_TLS_VERIFY=true.

- default false.
- если true — жирный warning в логах.

DoD PHASE 3:

- В проде нет SKIP_TLS_VERIFY=true.
- Поведение детерминированное и прозрачно видно из логов старта.

PHASE 4 — Усилить bootstrap (антиабуз)
Задача 4.1
Для /v1/register ввести enrollment token:

- одноразовый/короткоживущий,
- привязан к INN.

Задача 4.2
Rate-limit на /v1/register.

Задача 4.3
Аудит-события:

- register_attempt, register_success, register_denied, activate_denied_mtls, activate_denied_binding.

DoD PHASE 4:

- Регистрация без валидного enrollment token отклоняется.
- Есть аудит в БД/логах.

PHASE 5 — Тесты (строго по чеклисту)
Integration tests (lic-server)

1. /v1/register без client cert -> 200.
2. /v1/activate без client cert -> 401/403.
3. /v1/activate с cert от правильной CA, но без binding -> 403.
4. /v1/activate с cert и корректным binding -> 200.
5. /v1/activate с binding другого INN -> 403.

Integration tests (licd -> lic-server)

1. fresh start (нет cert/key) -> register -> cert/key сохранены -> activate 200.
2. restart licd -> activate/refresh работает с сохранёнными cert/key.
3. revoked cert binding -> activate fail.

PHASE 6 — Конкретно что убрать/оставить в docker-compose.prod/env
Для licd убрать (после PHASE 3):

- CA_PATH (если trust только embedded),
- SKIP_TLS_VERIFY (или оставить, но жестко false в prod).

Для licd оставить:

- LICENSE_SERVER_URL=https://<prod-domain>
- CERT_PATH=/data/client.crt
- KEY_PATH=/data/client.key
- STORAGE_FILE_PATH=/data/licd.db

Для lic-server оставить:

- CA_PATH, CA_KEY_PATH, SERVER_CERT_PATH, SERVER_KEY_PATH, LICENSE_KEY_PATH, DB_PATH
  (это рабочие параметры сервера CA/подписи).

PHASE 7 — Критерии готовности релиза

1. Bootstrap успешен только с enrollment token.
2. Activate/heartbeat строго по mTLS.
3. lic-server проверяет, что cert принадлежит нужному INN.
4. В проде SKIP_TLS_VERIFY=false.
5. Все тесты из PHASE 5 зелёные.
6. В логах нет “тихих” ошибок загрузки cert/key.

Мини-ТЗ

1. Добавить endpoint-level mTLS enforcement для /v1/activate (+ /v1/heartbeat).
2. Добавить cert binding storage и проверку binding cert -> inn.
3. Сохранение binding при /v1/register.
4. Добавить enrollment token на /v1/register.
5. Улучшить логи licd по cert/key loading.
6. Убрать/дезактивировать в prod SKIP_TLS_VERIFY=true.
7. Написать интеграционные тесты по матрице access-control.
