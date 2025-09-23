package usecases

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/deymonster/licd/internal/domain/entities"
	"github.com/deymonster/licd/internal/storage/sqlite"
)

// DeviceUseCase содержит бизнес-логику для работы с устройствами
type DeviceUseCase struct {
	activationRepo *sqlite.ActivationRepository
	maxAgents      int
	jobName        string
}

// NewDeviceUseCase создаёт новый экземпляр DeviceUseCase
func NewDeviceUseCase(activationRepo *sqlite.ActivationRepository, maxAgents int, jobName string) *DeviceUseCase {
	if jobName == "" {
		jobName = "windows-agents"
	}
	return &DeviceUseCase{
		activationRepo: activationRepo,
		maxAgents:      maxAgents,
		jobName:        jobName,
	}
}

// activationToDevice преобразует Activation в Device
func (uc *DeviceUseCase) activationToDevice(activation *sqlite.Activation) *entities.Device {
	// Парсим labels для получения порта
	var labels map[string]interface{}
	port := 9182 // дефолт
	if activation.Labels != "" {
		if err := json.Unmarshal([]byte(activation.Labels), &labels); err == nil {
			if portVal, ok := labels["port"]; ok {
				switch v := portVal.(type) {
				case float64:
					port = int(v)
				case string:
					fmt.Sscanf(v, "%d", &port)
				}
			}
		}
	}

	// Генерируем ID на основе AgentKey (стабильно)
	deviceID := fmt.Sprintf("device-%s", activation.AgentKey)

	device := &entities.Device{
		ID:       deviceID,
		AgentKey: activation.AgentKey,
		IP:       activation.IP,
		Port:     port,
		Status:   entities.StatusActive, // все активации считаются активными
	}

	// Таймстемпы
	if activation.ActivatedAt != nil {
		device.CreatedAt = *activation.ActivatedAt
	} else {
		device.CreatedAt = time.Now()
	}
	if activation.LastSeenAt != nil {
		device.UpdatedAt = *activation.LastSeenAt
	} else {
		device.UpdatedAt = time.Now()
	}

	return device
}

// CreateDevice — активирует устройство (и пишет labels в БД)
func (uc *DeviceUseCase) CreateDevice(ctx context.Context, agentKey, ip string, port int) (*entities.Device, error) {
	// labels пишем так, чтобы потом отдать их в SD
	labels := map[string]string{
		"port":             fmt.Sprintf("%d", port),
		"job":              uc.jobName, // job из конфига
		"__meta_agent_key": agentKey,   // meta-лейбл
		// __meta_device_id посчитаем на отдаче /sd/targets, чтоб не держать дублирование
	}

	// Активируем устройство через репозиторий (лимит берётся из license_info, а при его отсутствии — uc.maxAgents)
	activation, err := uc.activationRepo.ActivateDevice(ctx, agentKey, ip, labels, uc.maxAgents)
	if err != nil {
		return nil, fmt.Errorf("failed to activate device: %w", err)
	}

	// Преобразуем в Device
	device := uc.activationToDevice(activation)
	return device, nil
}

// GetDevice
func (uc *DeviceUseCase) GetDevice(ctx context.Context, deviceID string) (*entities.Device, error) {
	if deviceID == "" {
		return nil, fmt.Errorf("device ID cannot be empty")
	}
	agentKey := deviceID
	if len(deviceID) > 7 && deviceID[:7] == "device-" {
		agentKey = deviceID[7:]
	}

	acts, err := uc.activationRepo.GetActivations(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get activations: %w", err)
	}
	for i := range acts {
		if acts[i].AgentKey == agentKey {
			return uc.activationToDevice(&acts[i]), nil
		}
	}
	return nil, fmt.Errorf("device not found: %s", deviceID)
}

// GetActiveDevices
func (uc *DeviceUseCase) GetActiveDevices(ctx context.Context) ([]*entities.Device, error) {
	acts, err := uc.activationRepo.GetActivations(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get activations: %w", err)
	}
	out := make([]*entities.Device, 0, len(acts))
	for i := range acts {
		out = append(out, uc.activationToDevice(&acts[i]))
	}
	return out, nil
}

// GetPrometheusTargets — готовит targets и labels для SD
func (uc *DeviceUseCase) GetPrometheusTargets(ctx context.Context) ([]*entities.Target, error) {
	acts, err := uc.activationRepo.GetActivations(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get activations: %w", err)
	}
	targets := make([]*entities.Target, 0, len(acts))
	for i := range acts {
		// вынимаем порт из labels
		var labels map[string]interface{}
		port := 9182
		if acts[i].Labels != "" {
			if err := json.Unmarshal([]byte(acts[i].Labels), &labels); err == nil {
				if portVal, ok := labels["port"]; ok {
					switch v := portVal.(type) {
					case float64:
						port = int(v)
					case string:
						fmt.Sscanf(v, "%d", &port)
					}
				}
			}
		}
		deviceID := fmt.Sprintf("device-%s", acts[i].AgentKey)

		// формируем labels под твои требования
		lbls := map[string]string{
			"job":              uc.jobName,
			"__meta_device_id": deviceID,
			"__meta_agent_key": acts[i].AgentKey,
		}

		targets = append(targets, &entities.Target{
			Address: fmt.Sprintf("%s:%d", acts[i].IP, port),
			Labels:  lbls,
		})
	}
	return targets, nil
}

func (uc *DeviceUseCase) GetLicenseStatus(ctx context.Context) (*entities.LicenseStatus, error) {
	ls, err := uc.activationRepo.GetLicenseStatus(ctx)
	if err != nil {
		return nil, err
	}
	return &entities.LicenseStatus{
		UsedSlots:      ls.UsedSlots,
		MaxSlots:       ls.MaxSlots,
		RemainingSlots: ls.RemainingSlots,
		Status:         ls.Status,
		ExpiresAt:      ls.ExpiresAt,
		LastHeartbeat:  ls.LastHeartbeat,
		IsOnline:       true, // локальный licd “в онлайне”
	}, nil
}

// UpdateDeviceStatus — no-op (совместимость)
func (uc *DeviceUseCase) UpdateDeviceStatus(ctx context.Context, deviceID string, status entities.Status) error {
	return nil
}

// DeleteDevice — деактивирует
func (uc *DeviceUseCase) DeleteDevice(ctx context.Context, deviceID string) error {
	if deviceID == "" {
		return fmt.Errorf("device ID cannot be empty")
	}
	agentKey := deviceID
	if len(deviceID) > 7 && deviceID[:7] == "device-" {
		agentKey = deviceID[7:]
	}
	if err := uc.activationRepo.DeactivateDevice(ctx, agentKey); err != nil {
		return fmt.Errorf("failed to deactivate device: %w", err)
	}
	return nil
}

// GetDeviceStats — просто счётчик
func (uc *DeviceUseCase) GetDeviceStats(ctx context.Context) (int, error) {
	acts, err := uc.activationRepo.GetActivations(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get activations: %w", err)
	}
	return len(acts), nil
}
