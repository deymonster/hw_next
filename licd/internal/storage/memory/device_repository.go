package memory

import (
	"context"
	"fmt"
	"sync"

	"github.com/deymonster/licd/internal/domain/entities"
	"github.com/deymonster/licd/internal/domain/repositories"
)

// DeviceRepository реализация репозитория устройств в памяти
type DeviceRepository struct {
	devices map[string]*entities.Device
	mutex   sync.RWMutex
}

// NewDeviceRepository создает новый экземпляр репозитория
func NewDeviceRepository() repositories.DeviceRepository {
	return &DeviceRepository{
		devices: make(map[string]*entities.Device),
	}
}

// Save сохраняет устройство
func (r *DeviceRepository) Save(ctx context.Context, device *entities.Device) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	if device.ID == "" {
		return fmt.Errorf("device ID cannot be empty")
	}

	r.devices[device.ID] = device
	return nil
}

// FindByID находит устройство по ID
func (r *DeviceRepository) FindByID(ctx context.Context, id string) (*entities.Device, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	device, exists := r.devices[id]
	if !exists {
		return nil, fmt.Errorf("device with ID %s not found", id)
	}

	return device, nil
}

// FindActive возвращает все активные устройства
func (r *DeviceRepository) FindActive(ctx context.Context) ([]*entities.Device, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	var activeDevices []*entities.Device
	for _, device := range r.devices {
		if device.Status == entities.StatusActive {
			activeDevices = append(activeDevices, device)
		}
	}

	return activeDevices, nil
}

// Delete удаляет устройство
func (r *DeviceRepository) Delete(ctx context.Context, id string) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	if _, exists := r.devices[id]; !exists {
		return fmt.Errorf("device with ID %s not found", id)
	}

	delete(r.devices, id)
	return nil
}

// Count возвращает количество устройств
func (r *DeviceRepository) Count(ctx context.Context) (int, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	return len(r.devices), nil
}

// GetPrometheusTargets возвращает цели для Prometheus
func (r *DeviceRepository) GetPrometheusTargets(ctx context.Context) ([]*entities.Target, error) {
	activeDevices, err := r.FindActive(ctx)
	if err != nil {
		return nil, err
	}

	var targets []*entities.Target
	for _, device := range activeDevices {
		target := &entities.Target{
			Address: device.GetAddress(),
			Labels: map[string]string{
				"agent_key": device.AgentKey,
				"device_id": device.ID,
				"job":       "licd-agent",
			},
		}
		targets = append(targets, target)
	}

	return targets, nil
}