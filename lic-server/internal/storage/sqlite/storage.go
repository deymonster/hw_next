package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type Storage struct {
	db *sql.DB
}

type License struct {
	ID             int64
	INN            string
	Organization   string
	MaxSlots       int
	UsedSlots      int
	RemainingSlots int
	Status         string
	ExpiresAt      time.Time
	CreatedAt      time.Time
}

func NewStorage(dbPath string) (*Storage, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	s := &Storage{db: db}
	if err := s.initSchema(); err != nil {
		return nil, fmt.Errorf("failed to init schema: %w", err)
	}

	return s, nil
}

func (s *Storage) Close() error {
	return s.db.Close()
}

func (s *Storage) initSchema() error {
	query := `
	CREATE TABLE IF NOT EXISTS licenses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		inn TEXT NOT NULL UNIQUE,
		organization TEXT NOT NULL,
		max_slots INTEGER NOT NULL DEFAULT 10,
		used_slots INTEGER NOT NULL DEFAULT 0,
		status TEXT NOT NULL DEFAULT 'active',
		expires_at DATETIME NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := s.db.Exec(query)
	return err
}

func (s *Storage) GetLicenseByINN(ctx context.Context, inn string) (*License, error) {
	query := `
		SELECT id, inn, organization, max_slots, used_slots, status, expires_at, created_at
		FROM licenses
		WHERE inn = ?
	`
	row := s.db.QueryRowContext(ctx, query, inn)

	var l License
	err := row.Scan(
		&l.ID,
		&l.INN,
		&l.Organization,
		&l.MaxSlots,
		&l.UsedSlots,
		&l.Status,
		&l.ExpiresAt,
		&l.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan license: %w", err)
	}

	l.RemainingSlots = l.MaxSlots - l.UsedSlots
	return &l, nil
}

// CreateLicense adds a new license (helper for seeding/admin)
func (s *Storage) CreateLicense(ctx context.Context, inn, org string, maxSlots int) error {
	query := `
		INSERT INTO licenses (inn, organization, max_slots, status, expires_at)
		VALUES (?, ?, ?, 'active', datetime('now', '+1 year'))
		ON CONFLICT(inn) DO NOTHING;
	`
	_, err := s.db.ExecContext(ctx, query, inn, org, maxSlots)
	if err != nil {
		return fmt.Errorf("failed to create license: %w", err)
	}
	return nil
}
