package entities

import (
	"fmt"
	"time"
)

// Device представляет устройство в системе
type Device struct {
	ID        string    `json:"id"`
	AgentKey  string    `json:"agentKey"`
	IP        string    `json:"ip"`
	Port      int       `json:"port"`
	Status    Status    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Status представляет статус устройства
type Status string

const (
	StatusActive   Status = "active"
	StatusInactive Status = "inactive"
)

// Target представляет цель для Prometheus
type Target struct {
	Address string            `json:"address"`
	Labels  map[string]string `json:"labels"`
}

// IsValid проверяет валидность устройства
func (d *Device) IsValid() bool {
	return d.ID != "" && d.IP != "" && d.Port > 0
}

// GetAddress возвращает адрес устройства для Prometheus
func (d *Device) GetAddress() string {
	return fmt.Sprintf("%s:%d", d.IP, d.Port)
}
