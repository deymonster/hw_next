package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

// ActivationRepository реализует работу с активациями
type ActivationRepository struct {
	db *sql.DB
}

// NewActivationRepository создает новый репозиторий активаций
func NewActivationRepository(db *sql.DB) *ActivationRepository {
	return &ActivationRepository{db: db}
}

// ActivateDevice активирует устройство с проверкой лимитов из license_info
func (r *ActivationRepository) ActivateDevice(ctx context.Context, agentKey, ip string, labels map[string]string, fallbackMaxAgents int) (*Activation, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Получаем лимит из license_info (приоритет) или используем fallback
	var maxAgents int
	err = tx.QueryRowContext(ctx, `
		SELECT COALESCE(max_agents, ?) 
		FROM license_info 
		WHERE status = 'active' 
		ORDER BY created_at DESC 
		LIMIT 1
	`, fallbackMaxAgents).Scan(&maxAgents)
	if err == sql.ErrNoRows {
		// Если нет активной лицензии, используем fallback
		maxAgents = fallbackMaxAgents
	} else if err != nil {
		return nil, fmt.Errorf("failed to get license limit: %w", err)
	}

	// Проверяем текущее количество активаций
	var currentCount int
	err = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM activations").Scan(&currentCount)
	if err != nil {
		return nil, fmt.Errorf("failed to count activations: %w", err)
	}

	// Проверяем существование агента
	var existingActivation Activation
	err = tx.QueryRowContext(ctx, `
		SELECT agent_key, ip, labels, activation_sig, hardware_hash, 
		       activated_at, updated_at, last_seen_at 
		FROM activations WHERE agent_key = ?
	`, agentKey).Scan(
		&existingActivation.AgentKey,
		&existingActivation.IP,
		&existingActivation.Labels,
		&existingActivation.ActivationSig,
		&existingActivation.HardwareHash,
		&existingActivation.ActivatedAt,
		&existingActivation.UpdatedAt,
		&existingActivation.LastSeenAt,
	)

	labelsJSON, _ := json.Marshal(labels)
	now := time.Now().UTC() // Используем UTC
	isNew := false

	if err == sql.ErrNoRows {
		// Новая активация - проверяем лимит
		if currentCount >= maxAgents {
			return nil, fmt.Errorf("license limit exceeded: %d/%d", currentCount, maxAgents)
		}

		// Создаем новую активацию
		_, err = tx.ExecContext(ctx, `
			INSERT INTO activations (agent_key, ip, labels, activated_at, updated_at, last_seen_at)
			VALUES (?, ?, ?, ?, ?, ?)
		`, agentKey, ip, labelsJSON, now, now, now)
		if err != nil {
			return nil, fmt.Errorf("failed to insert activation: %w", err)
		}

		existingActivation = Activation{
			AgentKey:    agentKey,
			IP:          ip,
			Labels:      string(labelsJSON),
			ActivatedAt: &now,
			UpdatedAt:   &now,
			LastSeenAt:  &now,
		}
		isNew = true
	} else if err != nil {
		return nil, fmt.Errorf("failed to query activation: %w", err)
	} else {
		// Обновляем существующую активацию
		_, err = tx.ExecContext(ctx, `
			UPDATE activations 
			SET ip = ?, labels = ?, last_seen_at = ?
			WHERE agent_key = ?
		`, ip, labelsJSON, now, agentKey)
		if err != nil {
			return nil, fmt.Errorf("failed to update activation: %w", err)
		}

		existingActivation.IP = ip
		existingActivation.Labels = string(labelsJSON)
		existingActivation.LastSeenAt = &now
	}

	// Логируем действие
	if err := r.logAction(ctx, tx, "activate", agentKey, ip, "success", map[string]interface{}{
		"agent_key": agentKey,
		"ip":        ip,
		"labels":    labels,
		"is_new":    isNew,
		"max_agents": maxAgents,
	}); err != nil {
		return nil, fmt.Errorf("failed to log activation: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &existingActivation, nil
}

// DeactivateDevice удаляет активацию устройства
func (r *ActivationRepository) DeactivateDevice(ctx context.Context, agentKey string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, "DELETE FROM activations WHERE agent_key = ?", agentKey)
	if err != nil {
		return fmt.Errorf("failed to delete activation: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("activation not found: %s", agentKey)
	}

	// Логируем деактивацию
	if err := r.logAction(ctx, tx, "deactivate", agentKey, "", "success", map[string]interface{}{
		"agent_key": agentKey,
	}); err != nil {
		return fmt.Errorf("failed to log deactivation: %w", err)
	}

	return tx.Commit()
}

// GetActivations возвращает все активации для Prometheus SD
func (r *ActivationRepository) GetActivations(ctx context.Context) ([]Activation, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT agent_key, ip, labels, activation_sig, hardware_hash,
		       activated_at, updated_at, last_seen_at
		FROM activations
		ORDER BY activated_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query activations: %w", err)
	}
	defer rows.Close()

	var activations []Activation
	for rows.Next() {
		var a Activation
		err := rows.Scan(
			&a.AgentKey, &a.IP, &a.Labels, &a.ActivationSig,
			&a.HardwareHash, &a.ActivatedAt, &a.UpdatedAt, &a.LastSeenAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan activation: %w", err)
		}
		activations = append(activations, a)
	}
	// Проверяем ошибки rows
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return activations, nil
}

// GetLicenseStatus возвращает статус лицензии
func (r *ActivationRepository) GetLicenseStatus(ctx context.Context) (*LicenseStatus, error) {
	var used, max int
	var status string
	var expiresAt, lastHeartbeat *time.Time

	// Получаем количество используемых слотов
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM activations").Scan(&used)
	if err != nil {
		return nil, fmt.Errorf("failed to count used slots: %w", err)
	}
	fmt.Printf("[DEBUG] Used slots: %d\n", used)

	// Получаем информацию о лицензии
	err = r.db.QueryRowContext(ctx, `
	    SELECT COALESCE(max_agents, 0), status, expires_at, last_heartbeat_at
	    FROM license_info 
	    WHERE status = 'active'
	    ORDER BY created_at DESC 
	    LIMIT 1
	`).Scan(&max, &status, &expiresAt, &lastHeartbeat)
	
	fmt.Printf("[DEBUG] Query error: %v\n", err)
	fmt.Printf("[DEBUG] Max agents: %d, Status: %s\n", max, status)
	
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to get license info: %w", err)
	}

	// Если лицензия не найдена, устанавливаем значения по умолчанию
	if err == sql.ErrNoRows {
		fmt.Printf("[DEBUG] No active license found, using defaults\n")
		status = "inactive"
		max = 0
	}

	remaining := max - used
	if remaining < 0 {
		remaining = 0
	}

	fmt.Printf("[DEBUG] Final result - Used: %d, Max: %d, Remaining: %d, Status: %s\n", used, max, remaining, status)

	return &LicenseStatus{
		UsedSlots:      used,
		MaxSlots:       max,
		RemainingSlots: remaining,
		Status:         status,
		ExpiresAt:      expiresAt,
		LastHeartbeat:  lastHeartbeat,
	}, nil
}

// logAction записывает действие в аудит лог
func (r *ActivationRepository) logAction(ctx context.Context, tx *sql.Tx, action, agentKey, ip, result string, details map[string]interface{}) error {
	detailsJSON, _ := json.Marshal(details)
	
	_, err := tx.ExecContext(ctx, `
		INSERT INTO audit_log (action, agent_key, ip, result, details)
		VALUES (?, ?, ?, ?, ?)
	`, action, agentKey, ip, result, detailsJSON)
	
	return err
}