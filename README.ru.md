# Система мониторинга оборудования

## Краткое описание программного обеспечения

Система мониторинга оборудования представляет собой комплексное решение для наблюдения за состоянием компьютеров и серверов в локальной сети. Система построена на базе современных технологий, включая Next.js, Prometheus и Go-агенты, и предоставляет удобный веб-интерфейс для мониторинга и управления устройствами.

Основное назначение системы — автоматическое обнаружение устройств в сети, сбор метрик о состоянии оборудования (CPU, RAM, диски, температура и т.д.), оповещение о критических событиях и предоставление аналитической информации в режиме реального времени.

## Функциональные характеристики

### Обнаружение и каталог устройств

- Автоматическое сканирование подсетей (ARP/ping/TCP) для обнаружения устройств
- Ручное добавление по IP/домену, игнор-лист для исключений
- Группировка по отделам/подсетям, фильтры, теги и быстрый поиск
- Карточка устройства: имя, IP, MAC, ОС и её версия, хостнейм, тип устройства
- Инвентарные данные: производитель/модель, серийные номера (BIOS/материнская плата — если доступны)
- Статусы: онлайн/офлайн, время последней метрики, индикаторы проблем (перегруз, заполнение диска и т.п.)

### Сбор метрик (агенты)

- CPU: общая загрузка, загрузка по ядрам, температура (при наличии датчиков)
- Память: общий объём, использование, свободно, swap
- Диски: общий объём, использование по файловым системам, доступное место, базовые I/O
- GPU: модель/производитель, загрузка/память (если поддерживается агентом)
- Сеть: интерфейсы, трафик, ошибки/дропы, IP/MAC, скорость линка
- Процессы: количество, топ потребители CPU/RAM, отслеживание обязательных процессов
- Система: аптайм, версия ОС, hostname, информация о BIOS и материнской плате

### Prometheus и Alertmanager

- Динамическая конфигурация целей Prometheus (`PROMETHEUS_TARGETS_PATH`), автоматическое добавление/удаление
- Метки (labels) устройств/отделов для гибкой фильтрации графиков и правил
- Проксирование Prometheus через Nginx с поддержкой Basic Auth для UI
- Интеграция с Alertmanager для маршрутизации и доставки оповещений

### Оповещения и правила

- Пороговые условия: загрузка CPU, использование RAM, заполнение диска, температура
- Доступность: офлайн‑устройство, отсутствие метрик от агента за заданный интервал, недоступность сервиса
- Процессы: отсутствие обязательного процесса, превышение ресурсоёмкости указанного процесса
- Композитные условия (AND/OR) и уровни критичности: info / warning / critical
- Каналы уведомлений: Telegram, Email, внутренняя панель уведомлений
- Дедупликация событий, подавление (mute), окна обслуживания (maintenance) и повторы (re‑notify)
- Маршрутизация получателей по отделам/тегам, гибкая настройка частоты уведомлений

### Интерфейс

- Современная адаптивная панель управления с графиками и таблицами
- Детальные страницы устройств и отделов, фильтры и поиск
- Тёмная/светлая тема, i18n (русский/английский), уведомления в UI

### Пользователи и доступ

- Аутентификация через Next‑Auth, восстановление пароля по email
- Роли доступа: администратор, оператор, просмотр (при необходимости)
- Базовый аудит ключевых действий (создание правил, изменение устройств)

### Инвентаризация и хранилище

- Учёт оборудования и характеристик (ОС, железо, серийные номера)
- Хранилище загрузок и логов (`storage/uploads`, `storage/logs`) с доступом через Nginx

### Лицензирование (LICD)

- Интеграция со встроенным сервисом лицензирования LICD
- Учёт активных устройств и ограничений лицензии, API для проверки ключей

## Руководство по развертыванию

### Системные требования

1. Операционная система:

    - Linux (рекомендуется Ubuntu 20.04+)
    - Windows 10/11 с WSL2
    - macOS 12+

2. Минимальные требования к оборудованию:
    - CPU: 2 ядра
    - RAM: 4 ГБ
    - Диск: 20 ГБ свободного места

## Технологический стек

### Фронтенд

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Next-Auth для аутентификации

### Бэкенд

- Next.js API routes
- Prisma ORM
- PostgreSQL база данных
- Redis для кэширования
- Node.js

### Мониторинг

- Prometheus для сбора метрик
- AlertManager для обработки оповещений
- Пользовательские Go-агенты для рабочих станций
- Nginx в качестве обратного прокси

## Предварительные требования

- Docker и Docker Compose

## Настройка окружения

### Быстрый старт для локальной разработки

Для запуска всех сервисов в Docker достаточно выполнить:

```bash
bash scripts/setup-local.sh --start-next
```

Скрипт:

- проверяет наличие Docker/Compose
- генерирует `.env` с локальными значениями (рандомные пароли, `localhost` в URL)
- создаёт необходимые каталоги (`storage/logs`, `storage/uploads`, `nginx/auth/.htpasswd`)
- запускает `docker-compose.dev.yml`
- выполняет `yarn install`, `yarn prisma generate`, `yarn prisma migrate deploy`
- по флагу `--start-next` автоматически запускает `yarn dev`

Дополнительные флаги:

- `--host <адрес>` — подставляет ваш IP/домен в ссылках (по умолчанию `localhost`)
- `--admin-email <email>` — email администратора по умолчанию
- `--skip-yarn` — пропустить установку зависимостей и миграции

После выполнения скрипта сервисы будут доступны по адресам:

| Сервис       | URL/порт              |
| ------------ | --------------------- |
| Next.js UI   | http://localhost:3000 |
| PostgreSQL   | 127.0.0.1:5432        |
| Redis        | 127.0.0.1:6379        |
| Prometheus   | http://localhost:9090 |
| Alertmanager | http://localhost:9093 |
| Nginx proxy  | http://localhost:8080 |
| Хранилище    | http://localhost:8081 |
| LICD сервис  | http://localhost:8082 |

Скрипт перезаписывает `.env`, сохраняя уже заданные значения. При необходимости можно запускать его повторно.

### Вручную (альтернатива)

1. Установить Docker (с поддержкой Compose), Node.js 18+ и Yarn
2. Клонировать репозиторий и скопировать `.env.example` → `.env`
3. Заполнить переменные окружения (см. список ниже)
4. Создать каталоги `storage/logs`, `storage/uploads` и файл `nginx/auth/.htpasswd` (пароль можно сгенерировать `openssl passwd -apr1 <password>`)
5. Запустить инфраструктуру: `docker compose -f docker-compose.dev.yml up -d --build`
6. Выполнить `yarn install`, `yarn prisma generate`, `yarn prisma migrate deploy`
7. Запустить Next.js: `yarn dev --hostname 0.0.0.0`

### Ключевые переменные окружения

- `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SERVER_IP`, `NEXT_PUBLIC_URL`
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_STORAGE_URL`, `NEXT_PUBLIC_UPLOADS_BASE_URL`, `NEXT_PUBLIC_MEDIA_URL`
- `POSTGRES_*`, `DATABASE_URL`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_URL`
- `PROMETHEUS_PROXY_URL`, `PROMETHEUS_USERNAME`, `PROMETHEUS_AUTH_PASSWORD`, `PROMETHEUS_TARGETS_PATH`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`
- `AGENT_HANDSHAKE_KEY`
- `ENCRYPTION_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`

## Руководство по развертыванию

### Системные требования

1. Операционная система:

    - Linux (рекомендуется Ubuntu 20.04+)
    - Windows 10/11
    - macOS 12+

2. Минимальные требования к оборудованию:
    - CPU: 2 ядра
    - RAM: 4 ГБ
    - Диск: 20 ГБ свободного места

## Установка серверной части

### Установка Docker и Docker Compose

#### Для Linux (Ubuntu/Debian):

````bash
# Установка Docker
sudo apt-get update
sudo apt-get install -y docker.io

# Установка Docker Compose
sudo apt-get install -y docker-compose

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker

# Проверка установки
docker --version
docker-compose --version

#### Для Windows:

1. Установите [Docker Desktop] с официального сайта: (https://www.docker.com/products/docker-desktop) для Windows.
2. Убедитесь, что включен Hyper-V в BIOS.
3. Установите [Docker Compose](https://docs.docker.com/compose/install/) для Windows.
4. После установки убедитесь, что Docker работает, запустив в командной строке:
   ```bash
   docker --version
   docker-compose --version
````

### Настройка и запуск системы

1. Настройка переменных окружения:
    - Скопируйте файл .env.example в .env
    - Отредактируйте .env файл, настроив следующие параметры:
        - `NEXT_PUBLIC_BASE_URL` и `NEXT_PUBLIC_SERVER_IP`: укажите IP-адрес вашего сервера
        - `POSTGRES_PASSWORD`: установите надежный пароль для базы данных
        - `TELEGRAM_BOT_TOKEN`: токен вашего Telegram бота (получите у @BotFather)
        - `TELEGRAM_CHAT_ID` и `ADMIN_TELEGRAM_CHAT_ID`: ID чата для получения уведомлений
        - `ADMIN_USERNAME`, `ADMIN_PASSWORD` и `ADMIN_EMAIL`: учетные данные администратора
        - `HANDSHAKE_KEY`: секретный ключ для агентов (придумайте сложный)
        - `PROMETHEUS_AUTH_PASSWORD`: пароль для доступа к Prometheus
        - Настройки SMTP для отправки email-уведомлений:
            - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
            - `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`
        - `ENCRYPTION_KEY`: ключ шифрования (сгенерируйте случайную строку)
        - `REDIS_PASSWORD`: пароль для Redis
        - `NEXTAUTH_SECRET`: секретный ключ для NextAuth (придумайте сложный)
2. Запуск системы:
    ```bash
    docker-compose up -d
    ```
3. Дождитесь завершения процесса установки и запуска.
4. Перейдите по адресу `http://localhost` в браузере или по IP адресу сервера, чтобы проверить работоспособность системы.

### Быстрый запуск (Ubuntu/Debian)

```bash
bash scripts/install.sh --server-ip <IP> --admin-email <email>
```

- `--server-ip` — внешний IP/домен сервера
- `--admin-email` — почта администратора

## SMTP Configuration

Для работы регистрации и email‑уведомлений необходимо настроить SMTP в `.env.prod`:

### Сборка Docker-образов по тегам (CI/CD)

Сборка и публикация Docker-образов запускается только при пуше специальных git-тегов. Обычные коммиты в ветки (например, `feature/*`) CI не запускают.

- Формат тега: `<service>-v<semver>`
- Допустимые значения `<service>`:
    - `hw-monitor` — основной сервис Next.js
    - `hw-monitor-licd` — сервис лицензирования LICD
    - `hw-monitor-nginx-combined` — объединённый Nginx (proxy + storage)
- Семантика версий:
    - `X.Y.Z-alpha` — альфа-стрим (предрелизные сборки)
    - `X.Y.Z` — стабильный релиз

Что делает CI при пуше тега:

- Собирает и публикует образ только указанного сервиса
- Публикует два Docker-тега:
    - alias-тег: `alpha` (для `-alpha`) или `latest` (для стабильных версий)
    - версионный тег: `<service>-vX.Y.Z[-alpha[.N]]`
- Для `X.Y.Z-alpha` без числового суффикса CI автоматически добавляет номер сборки `.N` по истории тегов.
  Пример: git-тег `hw-monitor-v1.0.0-alpha` → Docker-теги:
    - `deymonster/hw-monitor:alpha`
    - `deymonster/hw-monitor:hw-monitor-v1.0.0-alpha.3`

Соответствие сервисов и Dockerfile:

- `hw-monitor` → `Dockerfile` (контекст `.`)
- `hw-monitor-licd` → `licd/Dockerfile` (контекст `./licd`)
- `hw-monitor-nginx-combined` → `Dockerfile.nginx-combined` (контекст `.`)

Примеры команд (создание и пуш тегов):

- Next.js (альфа):
    ```bash
    git tag hw-monitor-v1.0.0-alpha
    git push origin hw-monitor-v1.0.0-alpha
    ```
- Next.js (стабильный):
    ```bash
    git tag hw-monitor-v1.0.0
    git push origin hw-monitor-v1.0.0
    ```
- LICD (альфа):
    ```bash
    git tag hw-monitor-licd-v1.0.0-alpha
    git push origin hw-monitor-licd-v1.0.0-alpha
    ```
- Nginx Combined (альфа):
    ```bash
    git tag hw-monitor-nginx-combined-v1.0.0-alpha
    git push origin hw-monitor-nginx-combined-v1.0.0-alpha
    ```

Примечания:

- Теги вида `v1.0.1` (без названия сервиса) не запускают сборку Docker-образов — используйте сервисные теги, как показано выше.
- Если нужен фиксированный номер альфа-сборки, добавьте его прямо в git-тег: `hw-monitor-v1.0.0-alpha.7`.

## Настройка и запуск клиентской части

- Скачайте [агент мониторинга](https://github.com/deymonster/custom_windows_exporter/releases/download/v1.0.10/NITRINOnetControlManagerSetup.exe)
- Установите агент, следуя инструкциям установщика
- После установки агент автоматически запустится и начнет отправлять метрики на сервер
