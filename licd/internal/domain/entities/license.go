package entities

import (
	"time"
)

// License представляет лицензию в системе
type License struct {
	ID              string       `json:"id"`
	InstallID       string       `json:"install_id"`
	LicenseKey      string       `json:"license_key"`
	CustomerData    CustomerData `json:"customer_data"`
	EncryptedData   []byte       `json:"encrypted_data,omitempty"`
	ServerSignature string       `json:"server_signature,omitempty"`
	MaxAgents       int          `json:"max_agents"`
	ExpiresAt       *time.Time   `json:"expires_at,omitempty"`
	Status          string       `json:"status"`
	HardwareHash    string       `json:"hardware_hash,omitempty"`
	LastHeartbeatAt *time.Time   `json:"last_heartbeat_at,omitempty"`
	KeyVersion      int          `json:"key_version"`
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
}

// CustomerData представляет данные клиента
type CustomerData struct {
	INN         string `json:"inn"`
	CompanyName string `json:"company_name"`
	Email       string `json:"email"`
	Phone       string `json:"phone,omitempty"`
	Address     string `json:"address,omitempty"`
}

// LicenseStatus представляет текущий статус лицензии
type LicenseStatus struct {
	UsedSlots      int        `json:"used_slots"`
	MaxSlots       int        `json:"max_slots"`
	RemainingSlots int        `json:"remaining_slots"`
	Status         string     `json:"status"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	LastHeartbeat  *time.Time `json:"last_heartbeat,omitempty"`
	IsOnline       bool       `json:"is_online"`
}

// IsValid проверяет валидность лицензии
func (l *License) IsValid() bool {
	if l.Status != "active" {
		return false
	}

	if l.ExpiresAt != nil && l.ExpiresAt.Before(time.Now()) {
		return false
	}

	return true
}

// IsExpired проверяет истек ли срок лицензии
func (l *License) IsExpired() bool {
	return l.ExpiresAt != nil && l.ExpiresAt.Before(time.Now())
}

// DaysUntilExpiry возвращает количество дней до истечения
func (l *License) DaysUntilExpiry() int {
	if l.ExpiresAt == nil {
		return -1 // Бессрочная лицензия
	}

	duration := time.Until(*l.ExpiresAt)
	return int(duration.Hours() / 24)
}
