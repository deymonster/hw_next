package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/mattn/go-sqlite3"
)

// Database представляет подключение к SQLite
type Database struct {
	db *sql.DB
}

// NewDatabase создает новое подключение к SQLite.
// ВАЖНО: миграции выполняются на ОТДЕЛЬНОМ подключении,
// затем открывается рабочее подключение к БД.
func NewDatabase(dbPath string) (*Database, error) {
	// 1) Создаем директорию
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	// Лог абсолютного пути к БД
	if abs, err := filepath.Abs(dbPath); err == nil {
		fmt.Printf("licd: using database file: %s\n", abs)
	} else {
		fmt.Printf("licd: WARN: failed to resolve absolute DB path: %v\n", err)
	}

	// 2) Прогоняем миграции на отдельном соединении
	if err := runMigrations(dbPath); err != nil && err != migrate.ErrNoChange {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	// 3) Открываем рабочее подключение (с нужными PRAGMA/DSN параметрами)
	dsn := fmt.Sprintf("%s?_foreign_keys=on&_journal_mode=WAL&_synchronous=NORMAL&_cache_size=1000&_temp_store=memory&_busy_timeout=5000", dbPath)
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Пул для SQLite
	db.SetMaxOpenConns(1) // единственная запись одновременно
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(time.Hour)

	// Проверяем соединение
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Database{db: db}, nil
}

// runMigrations — отдельная функция, открывает ВРЕМЕННОЕ подключение к БД,
// прогоняет миграции и закрывает его.
func runMigrations(dbPath string) error {
	// Абсолютный путь к миграциям
	wd, _ := os.Getwd()
	migrationsPath := "file://" + filepath.Join(wd, "migrations")

	// Отдельное подключение ТОЛЬКО для миграций (без спец. DSN — достаточно базового)
	mdb, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database for migrations: %w", err)
	}
	defer mdb.Close()

	driver, err := sqlite3.WithInstance(mdb, &sqlite3.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(migrationsPath, "sqlite3", driver)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}
	defer m.Close()

	// Применяем миграции
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to apply migrations: %w", err)
	}
	return nil
}

// DB возвращает экземпляр *sql.DB
func (d *Database) DB() *sql.DB { return d.db }

// Close закрывает подключение к базе данных
func (d *Database) Close() error { return d.db.Close() }

// HealthCheck — пинг БД
func (d *Database) HealthCheck() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return d.db.PingContext(ctx)
}
