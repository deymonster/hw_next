# Makefile для удобного управления разработкой и тестированием

.PHONY: dev-up dev-down dev-logs dev-clean dev-migrate dev-migrate-reset test-up test-down test-logs test-clean build-licd help

# === РАЗРАБОТКА ===
# Запуск ВСЕХ сервисов для разработки (кроме Next.js) + автоматические миграции
dev-up:
	@echo "🚀 Запуск ВСЕХ сервисов для разработки..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "⏳ Ожидание запуска PostgreSQL..."
	@sleep 5
	@echo "🔄 Применение миграций БД..."
	@npx prisma migrate deploy || (echo "❌ Ошибка применения миграций. Попробуйте: make dev-migrate" && exit 0)
	@echo "✅ ВСЕ сервисы запущены и миграции применены!"
	@echo "🚀 Теперь запустите: yarn dev"
	@echo "📋 Доступные сервисы:"
	@echo "  - PostgreSQL: localhost:${POSTGRES_PORT}"
	@echo "  - Redis: localhost:6379"
	@echo "  - LICD: http://localhost:8082"
	@echo "  - Prometheus: http://localhost:${PROMETHEUS_PORT}"
	@echo "  - Alertmanager: http://localhost:9093"
	@echo "  - Nginx Combined (Prometheus Proxy): http://localhost:8080"
	@echo "  - Nginx Combined (File Storage): http://localhost:8081"

# Остановка dev сервисов
dev-down:
	@echo "🛑 Остановка dev сервисов..."
	docker-compose -f docker-compose.dev.yml down

# Применение миграций в dev среде (локально)
dev-migrate:
	@echo "🔄 Применение миграций БД..."
	npx prisma migrate deploy

# Сброс БД и применение миграций заново
dev-migrate-reset:
	@echo "🔄 Сброс БД и применение миграций..."
	npx prisma migrate reset --force

# Логи dev сервисов
dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Полная очистка dev среды
dev-clean:
	@echo "🧹 Очистка dev среды..."
	docker-compose -f docker-compose.dev.yml down -v
	docker system prune -f

# === ТЕСТИРОВАНИЕ ===
# Полная сборка и запуск ВСЕХ сервисов в контейнерах
test-up:
	@echo "🔧 Сборка и запуск ВСЕХ сервисов в тестовой среде..."
	docker-compose -f docker-compose.test.yml up --build -d
	@echo "✅ ВСЯ тестовая среда запущена"
	@echo "📋 Доступные сервисы:"
	@echo "  - Next.js: http://localhost:3001"
	@echo "  - PostgreSQL: localhost:5433"
	@echo "  - Redis: localhost:6380"
	@echo "  - LICD: http://localhost:8083"
	@echo "  - Prometheus: http://localhost:9091"
	@echo "  - Alertmanager: http://localhost:9094"
	@echo "  - Nginx Combined (Prometheus Proxy): http://localhost:8085"
	@echo "  - Nginx Combined (File Storage): http://localhost:8084"

# Остановка тестовых сервисов
test-down:
	@echo "🛑 Остановка тестовых сервисов..."
	docker-compose -f docker-compose.test.yml down

# Логи тестовых сервисов
test-logs:
	docker-compose -f docker-compose.test.yml logs -f

# Полная очистка тестовой среды
test-clean:
	@echo "🧹 Очистка тестовой среды..."
	docker-compose -f docker-compose.test.yml down -v
	docker system prune -f

# === LICD ===
# Сборка LICD локально
build-licd:
	@echo "🔨 Сборка LICD сервиса..."
	cd licd && make docker-build
	@echo "✅ LICD собран"

# Пересборка только LICD в dev среде
rebuild-licd-dev:
	@echo "🔄 Пересборка LICD в dev среде..."
	docker-compose -f docker-compose.dev.yml build licd
	docker-compose -f docker-compose.dev.yml up -d licd
	@echo "✅ LICD пересобран и перезапущен"

# Пересборка только LICD в тестовой среде
rebuild-licd-test:
	@echo "🔄 Пересборка LICD в тестовой среде..."
	docker-compose -f docker-compose.test.yml build licd
	docker-compose -f docker-compose.test.yml up -d licd
	@echo "✅ LICD пересобран и перезапущен"

# === КОМБИНИРОВАННЫЕ КОМАНДЫ ===
# Быстрый старт разработки
dev-start: dev-up
	@echo "🎯 Запуск Next.js в режиме разработки..."
	@echo "⚡ Выполните: yarn dev"

# Полное тестирование фичи
test-feature: test-clean test-up
	@echo "🧪 Тестовая среда готова для проверки фичи"
	@echo "📱 Откройте http://localhost:3001 для тестирования"

# Проверка статуса сервисов
status:
	@echo "📊 Статус сервисов:"
	@echo "=== DEV среда ==="
	@docker-compose -f docker-compose.dev.yml ps 2>/dev/null || echo "Dev среда не запущена"
	@echo "=== TEST среда ==="
	@docker-compose -f docker-compose.test.yml ps 2>/dev/null || echo "Test среда не запущена"

# === ПОМОЩЬ ===
help:
	@echo "🛠️  Команды для разработки HW Monitor:"
	@echo ""
	@echo "📦 РАЗРАБОТКА (Next.js через yarn dev + ВСЕ сервисы в Docker):"
	@echo "  make dev-up          - Запуск ВСЕХ сервисов для разработки"
	@echo "  make dev-start       - Запуск сервисов + инструкция для yarn dev"
	@echo "  make dev-down        - Остановка dev сервисов"
	@echo "  make dev-logs        - Просмотр логов dev сервисов"
	@echo "  make dev-clean       - Полная очистка dev среды"
	@echo ""
	@echo "🧪 ТЕСТИРОВАНИЕ (ВСЕ сервисы в контейнерах):"
	@echo "  make test-up         - Сборка и запуск ВСЕЙ тестовой среды"
	@echo "  make test-feature    - Полное тестирование фичи"
	@echo "  make test-down       - Остановка тестовых сервисов"
	@echo "  make test-logs       - Просмотр логов тестовых сервисов"
	@echo "  make test-clean      - Полная очистка тестовой среды"
	@echo ""
	@echo "🔧 LICD:"
	@echo "  make build-licd      - Сборка LICD локально"
	@echo "  make rebuild-licd-dev - Пересборка LICD в dev среде"
	@echo "  make rebuild-licd-test - Пересборка LICD в тестовой среде"
	@echo ""
	@echo "📊 УТИЛИТЫ:"
	@echo "  make status          - Проверка статуса всех сред"
	@echo "  make help           - Показать эту справку"
	@echo ""
	@echo "📋 URL для доступа:"
	@echo "  DEV (yarn dev + Docker сервисы):"
	@echo "    Next.js: http://localhost:3000"
	@echo "    LICD: http://localhost:8082"
	@echo "    Prometheus: http://localhost:9090"
	@echo "    Alertmanager: http://localhost:9093"
	@echo "    Nginx Combined (Proxy): http://localhost:8080"
	@echo "    Nginx Combined (Storage): http://localhost:8081"
	@echo ""
	@echo "  TEST (все в Docker):"
	@echo "    Next.js: http://localhost:3001"
	@echo "    LICD: http://localhost:8083"
	@echo "    Prometheus: http://localhost:9091"
	@echo "    Alertmanager: http://localhost:9094"
	@echo "    Nginx Combined (Proxy): http://localhost:8085"
	@echo "    Nginx Combined (Storage): http://localhost:8084"