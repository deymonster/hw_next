package services

import (
	"context"
	"github.com/deymonster/licd/internal/domain/entities"
)

// DeviceService определяет интерфейс для работы с устройствами
type DeviceService interface {
	// ActivateDevice активирует устройство
	ActivateDevice(ctx context.Context, device *entities.Device) error
	
	// DeactivateDevice деактивирует устройство
	DeactivateDevice(ctx context.Context, deviceID string) error
	
	// GetActiveDevices возвращает список активных устройств
	GetActiveDevices(ctx context.Context) ([]*entities.Device, error)
	
	// GetDeviceByID возвращает устройство по ID
	GetDeviceByID(ctx context.Context, deviceID string) (*entities.Device, error)
}