package sqlite

import (
	"time"
)

// Activation представляет активацию устройства в БД
type Activation struct {
	AgentKey      string     `db:"agent_key"`
	IP            string     `db:"ip"`
	Labels        string     `db:"labels"` // JSON строка
	ActivationSig *string    `db:"activation_sig"`
	HardwareHash  *string    `db:"hardware_hash"`
	ActivatedAt   *time.Time `db:"activated_at"`
	UpdatedAt     *time.Time `db:"updated_at"`
	LastSeenAt    *time.Time `db:"last_seen_at"`
}

// LicenseInfo представляет информацию о лицензии в БД
type LicenseInfo struct {
	ID                int64      `db:"id"`
	InstallID         string     `db:"install_id"`
	LicenseKey        *string    `db:"license_key"`
	CustomerData      *string    `db:"customer_data"` // JSON строка
	EncryptedData     []byte     `db:"encrypted_data"`
	ServerSignature   *string    `db:"server_signature"`
	MaxAgents         int        `db:"max_agents"`
	ExpiresAt         *time.Time `db:"expires_at"`
	Status            string     `db:"status"`
	HardwareHash      *string    `db:"hardware_hash"`
	LastHeartbeatAt   *time.Time `db:"last_heartbeat_at"`
	KeyVersion        int        `db:"key_version"`
	CreatedAt         time.Time  `db:"created_at"`
	UpdatedAt         time.Time  `db:"updated_at"`
}

// LicenseStatus представляет статус лицензии
type LicenseStatus struct {
	UsedSlots      int        `json:"used_slots"`
	MaxSlots       int        `json:"max_slots"`
	RemainingSlots int        `json:"remaining_slots"`
	Status         string     `json:"status"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	LastHeartbeat  *time.Time `json:"last_heartbeat,omitempty"`
	IsOnline       bool       `json:"is_online"`
}

// AuditLog представляет запись аудита
type AuditLog struct {
	ID        int64     `db:"id"`
	Action    string    `db:"action"`
	AgentKey  *string   `db:"agent_key"`
	IP        *string   `db:"ip"`
	UserAgent *string   `db:"user_agent"`
	Result    string    `db:"result"`
	Details   *string   `db:"details"` // JSON строка
	CreatedAt time.Time `db:"created_at"`
}
