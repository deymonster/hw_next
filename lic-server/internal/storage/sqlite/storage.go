package sqlite

import (
	"context"
	"crypto/rand"
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

	CREATE TABLE IF NOT EXISTS client_cert_bindings (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		inn TEXT NOT NULL,
		cert_serial TEXT NOT NULL,
		cert_fingerprint_sha256 TEXT NOT NULL,
		subject_cn TEXT NOT NULL,
		issued_at DATETIME NOT NULL,
		expires_at DATETIME NOT NULL,
		status TEXT NOT NULL DEFAULT 'active',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_cert_serial ON client_cert_bindings(cert_serial);
	CREATE INDEX IF NOT EXISTS idx_cert_fingerprint ON client_cert_bindings(cert_fingerprint_sha256);
	CREATE INDEX IF NOT EXISTS idx_inn ON client_cert_bindings(inn);

	CREATE TABLE IF NOT EXISTS enrollment_tokens (
		token TEXT PRIMARY KEY,
		inn TEXT NOT NULL,
		expires_at DATETIME NOT NULL,
		used BOOLEAN DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_enrollment_inn ON enrollment_tokens(inn);

	CREATE TABLE IF NOT EXISTS audit_events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		action TEXT NOT NULL,
		inn TEXT,
		ip_address TEXT,
		details TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_audit_inn ON audit_events(inn);
	CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_events(action);
	`
	_, err := s.db.Exec(query)
	return err
}

type EnrollmentToken struct {
	Token     string
	INN       string
	ExpiresAt time.Time
	Used      bool
	CreatedAt time.Time
}

func (s *Storage) CreateEnrollmentToken(ctx context.Context, inn string, ttl time.Duration) (string, error) {
	// Generate random token (simplified for now, ideally use crypto/rand)
	// In production, use a proper CSPRNG and sufficient length
	// For this task, I'll use a UUID-like string or similar
	// Since I don't have uuid package, I'll use a simple random string
	// But wait, I can use crypto/rand
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	token := fmt.Sprintf("%x", b)

	query := `
		INSERT INTO enrollment_tokens (token, inn, expires_at)
		VALUES (?, ?, ?)
	`
	expiresAt := time.Now().Add(ttl)
	_, err = s.db.ExecContext(ctx, query, token, inn, expiresAt)
	if err != nil {
		return "", fmt.Errorf("failed to create enrollment token: %w", err)
	}
	return token, nil
}

func (s *Storage) ValidateAndConsumeEnrollmentToken(ctx context.Context, token, inn string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		SELECT inn, expires_at, used
		FROM enrollment_tokens
		WHERE token = ?
	`
	row := tx.QueryRowContext(ctx, query, token)

	var tInn string
	var expiresAt time.Time
	var used bool
	err = row.Scan(&tInn, &expiresAt, &used)
	if err == sql.ErrNoRows {
		return fmt.Errorf("invalid enrollment token")
	}
	if err != nil {
		return fmt.Errorf("database error: %w", err)
	}

	if used {
		return fmt.Errorf("enrollment token already used")
	}
	if time.Now().After(expiresAt) {
		return fmt.Errorf("enrollment token expired")
	}
	if tInn != inn {
		return fmt.Errorf("enrollment token does not match INN")
	}

	// Consume token
	updateQuery := `UPDATE enrollment_tokens SET used = 1 WHERE token = ?`
	_, err = tx.ExecContext(ctx, updateQuery, token)
	if err != nil {
		return fmt.Errorf("failed to consume token: %w", err)
	}

	return tx.Commit()
}

func (s *Storage) LogAudit(ctx context.Context, action, inn, ip, details string) error {
	query := `INSERT INTO audit_events (action, inn, ip_address, details) VALUES (?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, query, action, inn, ip, details)
	return err
}

type AuditEvent struct {
	ID        int64
	Action    string
	INN       string
	IPAddress string
	Details   string
	CreatedAt time.Time
}

func (s *Storage) GetAuditEvents(ctx context.Context, inn string) ([]*AuditEvent, error) {
	query := `SELECT id, action, inn, ip_address, details, created_at FROM audit_events WHERE inn = ? ORDER BY created_at DESC`
	rows, err := s.db.QueryContext(ctx, query, inn)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit events: %w", err)
	}
	defer rows.Close()

	var events []*AuditEvent
	for rows.Next() {
		var e AuditEvent
		if err := rows.Scan(&e.ID, &e.Action, &e.INN, &e.IPAddress, &e.Details, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan audit event: %w", err)
		}
		events = append(events, &e)
	}
	return events, rows.Err()
}

type ClientCertBinding struct {
	ID                    int64
	INN                   string
	CertSerial            string
	CertFingerprintSHA256 string
	SubjectCN             string
	IssuedAt              time.Time
	ExpiresAt             time.Time
	Status                string
	CreatedAt             time.Time
}

func (s *Storage) SaveClientCertBinding(ctx context.Context, b *ClientCertBinding) error {
	query := `
		INSERT INTO client_cert_bindings (inn, cert_serial, cert_fingerprint_sha256, subject_cn, issued_at, expires_at, status)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	_, err := s.db.ExecContext(ctx, query, b.INN, b.CertSerial, b.CertFingerprintSHA256, b.SubjectCN, b.IssuedAt, b.ExpiresAt, b.Status)
	if err != nil {
		return fmt.Errorf("failed to save client cert binding: %w", err)
	}
	return nil
}

func (s *Storage) GetClientCertBinding(ctx context.Context, fingerprint string) (*ClientCertBinding, error) {
	query := `
		SELECT id, inn, cert_serial, cert_fingerprint_sha256, subject_cn, issued_at, expires_at, status, created_at
		FROM client_cert_bindings
		WHERE cert_fingerprint_sha256 = ?
	`
	row := s.db.QueryRowContext(ctx, query, fingerprint)

	var b ClientCertBinding
	err := row.Scan(
		&b.ID,
		&b.INN,
		&b.CertSerial,
		&b.CertFingerprintSHA256,
		&b.SubjectCN,
		&b.IssuedAt,
		&b.ExpiresAt,
		&b.Status,
		&b.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan binding: %w", err)
	}
	return &b, nil
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

func (s *Storage) GetAllLicenses(ctx context.Context) ([]*License, error) {
	query := `
		SELECT id, inn, organization, max_slots, used_slots, status, expires_at, created_at
		FROM licenses
		ORDER BY created_at DESC
	`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query licenses: %w", err)
	}
	defer rows.Close()

	var licenses []*License
	for rows.Next() {
		var l License
		if err := rows.Scan(
			&l.ID, &l.INN, &l.Organization, &l.MaxSlots, &l.UsedSlots,
			&l.Status, &l.ExpiresAt, &l.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan license: %w", err)
		}
		l.RemainingSlots = l.MaxSlots - l.UsedSlots
		licenses = append(licenses, &l)
	}
	return licenses, rows.Err()
}

func (s *Storage) UpdateLicenseStatus(ctx context.Context, inn string, status string) error {
	query := `UPDATE licenses SET status = ? WHERE inn = ?`
	_, err := s.db.ExecContext(ctx, query, status, inn)
	if err != nil {
		return fmt.Errorf("failed to update license status: %w", err)
	}
	return nil
}

func (s *Storage) GetAllEnrollmentTokens(ctx context.Context) ([]*EnrollmentToken, error) {
	query := `SELECT token, inn, expires_at, used, created_at FROM enrollment_tokens ORDER BY created_at DESC`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query tokens: %w", err)
	}
	defer rows.Close()

	var tokens []*EnrollmentToken
	for rows.Next() {
		var t EnrollmentToken
		if err := rows.Scan(&t.Token, &t.INN, &t.ExpiresAt, &t.Used, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan token: %w", err)
		}
		tokens = append(tokens, &t)
	}
	return tokens, rows.Err()
}

func (s *Storage) GetAllAuditEvents(ctx context.Context, limit int) ([]*AuditEvent, error) {
	query := `SELECT id, action, inn, ip_address, details, created_at FROM audit_events ORDER BY created_at DESC LIMIT ?`
	rows, err := s.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit events: %w", err)
	}
	defer rows.Close()

	var events []*AuditEvent
	for rows.Next() {
		var e AuditEvent
		if err := rows.Scan(&e.ID, &e.Action, &e.INN, &e.IPAddress, &e.Details, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan audit event: %w", err)
		}
		events = append(events, &e)
	}
	return events, rows.Err()
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

// UpdateLicenseDetails updates the organization and max slots of a license
func (s *Storage) UpdateLicenseDetails(ctx context.Context, inn, org string, maxSlots int) error {
	query := `UPDATE licenses SET organization = ?, max_slots = ? WHERE inn = ?`
	_, err := s.db.ExecContext(ctx, query, org, maxSlots, inn)
	if err != nil {
		return fmt.Errorf("failed to update license details: %w", err)
	}
	return nil
}
