package repositories

import (
	"context"

	"github.com/deymonster/licd/internal/domain/entities"
)

// DeviceRepository определяет интерфейс для хранения устройств
type DeviceRepository interface {
	// Save сохраняет устройство
	Save(ctx context.Context, device *entities.Device) error

	// FindByID находит устройство по ID
	FindByID(ctx context.Context, deviceID string) (*entities.Device, error)

	// FindActive возвращает все активные устройства
	FindActive(ctx context.Context) ([]*entities.Device, error)

	// Delete удаляет устройство
	Delete(ctx context.Context, deviceID string) error

	// Count возвращает количество активных устройств
	Count(ctx context.Context) (int, error)

	// GetPrometheusTargets возвращает активные устройства как Prometheus targets
	GetPrometheusTargets(ctx context.Context) ([]*entities.Target, error)
}
