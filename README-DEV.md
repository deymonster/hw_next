# 🛠️ Руководство по разработке HW Monitor

Подробное пошаговое руководство для разработчиков по работе с проектом от исправления багов до релиза.

## 📋 Содержание

- [Настройка окружения](#настройка-окружения)
- [Workflow разработки](#workflow-разработки)
- [Исправление багов](#исправление-багов)
- [Добавление новых фич](#добавление-новых-фич)
- [Тестирование](#тестирование)
- [Релиз](#релиз)
- [Полезные команды](#полезные-команды)

## 🚀 Настройка окружения

### Первоначальная настройка

1. **Клонирование репозитория**

```bash
git clone <repository-url>
cd hw-monitor
```

2. **Установка зависимостей**

```bash
yarn install
```

3. **Настройка переменных окружения**

```bash
cp .env.example .env
# Отредактируйте .env файл с вашими настройками
```

4. **Проверка Docker**

```bash
docker --version
docker-compose --version
```

### Структура окружений

- **DEV** - для разработки (Next.js через `yarn dev` + сервисы в Docker)
- **TEST** - для тестирования (все в Docker контейнерах)
- **PROD** - продакшн (основной `docker-compose.prod.yml`)

## 🔄 Workflow разработки

### Общий процесс

### Ветки

- `main` - стабильная ветка для продакшна
- `feature/название-фичи` - новые функции
- `bugfix/название-бага` - исправления багов
- `hotfix/критический-баг` - критические исправления

## 🐛 Исправление багов

### Шаг 1: Создание ветки для бага

```bash
# Переключаемся на main и обновляем
git checkout main
git pull origin main

# Создаем ветку для бага
git checkout -b bugfix/fix-user-login-issue
```

### Шаг 2: Запуск среды разработки

```bash
# Запускаем все сервисы для разработки
make dev-up

# В отдельном терминале запускаем Next.js
yarn dev
```

**Доступные сервисы:**

- Next.js: http://localhost:3000
- LICD: http://localhost:8082
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Nginx Combined (Proxy): http://localhost:8080
- Nginx Combined (Storage): http://localhost:8081

### Шаг 3: Воспроизведение и исправление бага

1. **Воспроизведите баг** на http://localhost:3000
2. **Найдите причину** используя:
    - Логи браузера (F12)
    - Логи сервисов: `make dev-logs`
    - Логи Next.js в терминале
3. **Исправьте код**
4. **Проверьте исправление** (hot reload работает автоматически)

### Шаг 4: Тестирование исправления

```bash
# Полное тестирование в изолированной среде
make test-feature
```

Проверьте исправление на http://localhost:3001

### Шаг 5: Коммит и пуш

```bash
# Добавляем изменения
git add .

# Коммитим с описательным сообщением
git commit -m "fix: исправлена проблема с авторизацией пользователя

- Исправлена валидация email в форме входа
- Добавлена обработка ошибки неверного пароля
- Улучшены сообщения об ошибках

Fixes #123"

# Пушим ветку
git push origin bugfix/fix-user-login-issue
```

### Шаг 6: Создание Pull Request

1. Идите на GitHub/GitLab
2. Создайте PR из `bugfix/fix-user-login-issue` в `main`
3. Заполните описание:
    - Что исправлено
    - Как тестировать
    - Скриншоты (если нужно)

### Шаг 7: После мержа

```bash
# Переключаемся на main и обновляем
git checkout main
git pull origin main

# Удаляем локальную ветку
git branch -d bugfix/fix-user-login-issue

# Останавливаем dev среду
make dev-down
```

## ✨ Добавление новых фич

### Шаг 1: Планирование фичи

1. **Создайте issue** с описанием фичи
2. **Обсудите архитектуру** с командой
3. **Разбейте на подзадачи** если фича большая

### Шаг 2: Создание ветки

```bash
git checkout main
git pull origin main
git checkout -b feature/add-device-tags-and-location
```

### Шаг 3: Разработка

```bash
# Запуск среды разработки
make dev-up
yarn dev
```

**Процесс разработки:**

1. **Backend изменения** (если нужны):

    - Обновите схему БД в `prisma/schema.prisma`
    - Создайте миграции: `npx prisma migrate dev`
    - Обновите API endpoints в `app/api/`

2. **Frontend изменения**:

    - Создайте/обновите компоненты в `components/`
    - Добавьте новые страницы в `app/`
    - Обновите типы в TypeScript

3. **LICD изменения** (если нужны):
    - Внесите изменения в `licd/`
    - Пересоберите: `make rebuild-licd-dev`

### Шаг 4: Тестирование в процессе разработки

```bash
# Проверка типов
yarn type-check

# Линтинг
yarn lint

# Форматирование
yarn format
```

### Шаг 5: Полное тестирование фичи

```bash
# Остановка dev среды
make dev-down

# Полное тестирование в изолированной среде
make test-feature
```

**Чек-лист тестирования:**

- [ ] Фича работает как ожидается
- [ ] Не сломаны существующие функции
- [ ] UI отзывчивый на разных экранах
- [ ] Нет ошибок в консоли
- [ ] Данные корректно сохраняются в БД
- [ ] API возвращает правильные ответы

### Шаг 6: Документация

1. **Обновите README** если нужно
2. **Добавьте комментарии** к сложному коду
3. **Обновите API документацию** если добавили endpoints

### Шаг 7: Коммит и PR

```bash
git add .
git commit -m "feat: добавлены теги и местоположение для устройств

- Добавлена таблица device_tags в схему БД
- Создан API для управления тегами устройств
- Добавлен компонент TagManager для UI
- Реализован поиск по тегам и местоположению
- Добавлены тесты для новой функциональности

Closes #456"

git push origin feature/add-device-tags-and-location
```

Создайте PR с подробным описанием.

## 🧪 Тестирование

### Локальное тестирование

```bash
# Быстрое тестирование в dev среде
make dev-up
yarn dev

# Полное тестирование в изолированной среде
make test-feature
```

### Типы тестирования

1. **Функциональное** - проверка работы фич
2. **Регрессионное** - проверка что ничего не сломалось
3. **UI/UX** - проверка интерфейса
4. **API** - проверка endpoints
5. **Производительность** - проверка скорости работы

### Тестирование LICD изменений

```bash
# Если изменили LICD
make rebuild-licd-test

# Проверьте LICD API
curl http://localhost:8083/api/health
```

## 🚀 Релиз

### Подготовка к релизу

1. **Убедитесь что main актуален**

```bash
git checkout main
git pull origin main
```

2. **Проверьте что все PR смержены**

3. **Полное тестирование**

```bash
make test-feature
```

### Создание релиза

1. **Обновите версию** в `package.json`
2. **Обновите CHANGELOG.md**
3. **Создайте тег**

```bash
git tag -a v1.0.1 -m "Release v1.0.1: добавлены теги устройств"
git push origin v1.0.1
```

### Сборка Docker образов по тегам (CI/CD)

Сборка и публикация Docker-образов запускается только при пуше специальных тегов. Обычные коммиты в ветки (например, `feature/*`) CI не запускают.

- Формат тега: `<service>-v<semver>`
- Допустимые значения `<service>`:
    - `hw-monitor` — основной Next.js сервис
    - `hw-monitor-licd` — сервис лицензирования LICD
    - `hw-monitor-nginx-combined` — объединённый Nginx (proxy + storage)
- Семантика версий:
    - `X.Y.Z-alpha` — альфа-стрим (предварительные сборки)
    - `X.Y.Z` — стабильный релиз

Что делает CI при пуше тега:

- Собирает образ только для указанного сервиса и публикует два Docker-тега:
    - alias-тег: `alpha` (для `-alpha`) или `latest` (для стабильных)
    - версионный тег: `<service>-vX.Y.Z[-alpha[.N]]`
- Для `X.Y.Z-alpha` без числового суффикса CI автоматически добавит номер сборки `.N` по истории тегов.
  Пример: git-тег `hw-monitor-v1.0.0-alpha` → Docker-теги:
    - `deymonster/hw-monitor:alpha`
    - `deymonster/hw-monitor:hw-monitor-v1.0.0-alpha.3` (номер .3 будет вычислен автоматически)
- Для стабильных: git-тег `hw-monitor-v1.0.0` → Docker-теги:
    - `deymonster/hw-monitor:latest`
    - `deymonster/hw-monitor:hw-monitor-v1.0.0`

Команды для создания и пуша тегов:

1. Next.js (hw-monitor)

- Альфа:
    ```bash
    git tag hw-monitor-v1.0.0-alpha
    git push origin hw-monitor-v1.0.0-alpha
    ```
- Стабильный:
    ```bash
    git tag hw-monitor-v1.0.0
    git push origin hw-monitor-v1.0.0
    ```

2. LICD (hw-monitor-licd)

- Альфа:
    ```bash
    git tag hw-monitor-licd-v1.0.0-alpha
    git push origin hw-monitor-licd-v1.0.0-alpha
    ```

3. Nginx Combined (hw-monitor-nginx-combined)

- Альфа:
    ```bash
    git tag hw-monitor-nginx-combined-v1.0.0-alpha
    git push origin hw-monitor-nginx-combined-v1.0.0-alpha
    ```

Управление тегами:

- Просмотр тегов:
    ```bash
    git tag --list "hw-monitor*"
    ```
- Удаление локального тега:
    ```bash
    git tag -d hw-monitor-v1.0.0-alpha
    ```
- Удаление тега из удалённого репозитория:
    ```bash
    git push origin :refs/tags/hw-monitor-v1.0.0-alpha
    ```

Примечания:

- Теги вида `v1.0.1` (без названия сервиса) не запускают сборку Docker-образов — используйте сервисные теги, как показано выше.
- Если нужен фиксированный номер альфа-билда, указывайте его прямо в git-теге, например: `hw-monitor-v1.0.0-alpha.7`.
- Соответствие сервисов и Dockerfile:
    - `hw-monitor` → `Dockerfile` (контекст `.`)
    - `hw-monitor-licd` → `licd/Dockerfile` (контекст `./licd`)
    - `hw-monitor-nginx-combined` → `Dockerfile.nginx-combined` (контекст `.`)

### Деплой в продакшн

```bash
# На продакшн сервере
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d
```

## Installer Script (Production)

Run on a clean Ubuntu/Debian host:

```bash
bash scripts/install.sh --server-ip 192.168.1.10 --admin-email admin@example.com
```

#### Параметры скрипта установки

- `--server-ip` — IP/домен сервера
- `--admin-email` — почта администратора

Flags:

- `--server-ip` — публичный IP/хост (используется в `.env.prod`)
- `--admin-email` — почта администратора
- `--admin-password` — пароль администратора (если не указан, генерируется)
- `--telegram-bot-token` — токен бота (опционально)

The script installs Docker/Compose, generates `.env.prod`, prepares storage dirs, and starts `docker-compose.prod`.

### SMTP

Для отправки писем заполните в `.env.prod`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SMTP_FROM="HW Monitor <noreply@example.com>"
```

Проверьте отправку писем через форму восстановления пароля или регистрацию администратора.

## 📚 Полезные команды

### Make команды

```bash
# Разработка
make dev-up          # Запуск dev сервисов
make dev-down        # Остановка dev сервисов
make dev-logs        # Логи dev сервисов
make dev-clean       # Очистка dev среды

# Тестирование
make test-up         # Запуск test среды
make test-down       # Остановка test среды
make test-logs       # Логи test среды
make test-clean      # Очистка test среды

# LICD
make build-licd      # Сборка LICD
make rebuild-licd-dev # Пересборка LICD в dev
make rebuild-licd-test # Пересборка LICD в test

# Утилиты
make status          # Статус всех сред
make help           # Справка по командам
```

### Yarn команды

```bash
yarn dev            # Запуск Next.js в dev режиме
yarn build          # Сборка для продакшна
yarn start          # Запуск продакшн сборки
yarn lint           # Проверка кода
yarn format         # Форматирование кода
yarn type-check     # Проверка типов TypeScript
```

### Git команды

```bash
# Работа с ветками
git checkout -b feature/new-feature
git checkout main
git branch -d feature/old-feature

# Синхронизация
git pull origin main
git push origin feature-branch

# Информация
git status
git log --oneline
git branch -a
```

### Docker команды

```bash
# Просмотр контейнеров
docker ps
docker ps -a

# Логи
docker logs container_name
docker logs -f container_name

# Очистка
docker system prune
docker volume prune
```

## 🆘 Решение проблем

### Проблемы с портами

```bash
# Проверка занятых портов
lsof -i :3000
lsof -i :5432

# Остановка всех сред
make dev-down
make test-down
```

### Проблемы с базой данных

```bash
# Сброс dev БД
make dev-clean
make dev-up

# Применение миграций
npx prisma migrate dev
```

### Проблемы с Docker

```bash
# Полная очистка Docker
docker system prune -a
docker volume prune

# Пересборка образов
make test-clean
make test-up
```

### Проблемы с LICD

```bash
# Пересборка LICD
make rebuild-licd-dev
make rebuild-licd-test

# Проверка логов LICD
docker logs licd_dev
docker logs licd_test
```

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте этот README
2. Посмотрите логи: `make dev-logs` или `make test-logs`
3. Проверьте статус: `make status`
4. Создайте issue в репозитории
5. Обратитесь к команде разработки

---

**Удачной разработки! 🚀**
