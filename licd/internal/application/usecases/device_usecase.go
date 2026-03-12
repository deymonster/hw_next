package usecases

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/deymonster/licd/internal/domain/entities"
	"github.com/deymonster/licd/internal/domain/services"
	"github.com/deymonster/licd/internal/fingerprint"
	"github.com/deymonster/licd/internal/infrastructure/client"
	"github.com/deymonster/licd/internal/infrastructure/crypto"
	"github.com/deymonster/licd/internal/storage/sqlite"
)

// DeviceUseCase содержит бизнес-логику для работы с устройствами
type DeviceUseCase struct {
	activationRepo  *sqlite.ActivationRepository
	tokenService    *services.TokenService
	licenseClient   *client.LicenseClient
	keyManager      *crypto.KeyManager
	maxAgents       int
	jobName         string
	fingerprintSalt string
}

// NewDeviceUseCase создаёт новый экземпляр DeviceUseCase
func NewDeviceUseCase(
	activationRepo *sqlite.ActivationRepository,
	tokenService *services.TokenService,
	licenseClient *client.LicenseClient,
	keyManager *crypto.KeyManager,
	maxAgents int,
	jobName string,
	fingerprintSalt string,
) *DeviceUseCase {
	if jobName == "" {
		jobName = "windows-agents"
	}
	return &DeviceUseCase{
		activationRepo:  activationRepo,
		tokenService:    tokenService,
		licenseClient:   licenseClient,
		keyManager:      keyManager,
		maxAgents:       maxAgents,
		jobName:         jobName,
		fingerprintSalt: fingerprintSalt,
	}
}

// RegisterInstance registers the licd instance with the license server
func (uc *DeviceUseCase) RegisterInstance(ctx context.Context, inn string) error {
	if uc.keyManager == nil {
		return fmt.Errorf("key manager not configured")
	}

	// 1. Generate Key + CSR
	keyPEM, csrPEM, err := uc.keyManager.GenerateKeyAndCSR("licd-client")
	if err != nil {
		return fmt.Errorf("failed to generate key/CSR: %w", err)
	}

	// 2. Register (Exchange CSR for Certificate using INN)
	resp, err := uc.licenseClient.Register(ctx, inn, csrPEM)
	if err != nil {
		return fmt.Errorf("registration failed: %w", err)
	}

	// 3. Save Certs
	if err = uc.keyManager.SaveKey(keyPEM); err != nil {
		return fmt.Errorf("failed to save key: %w", err)
	}
	if err = uc.keyManager.SaveCert([]byte(resp.Certificate)); err != nil {
		return fmt.Errorf("failed to save cert: %w", err)
	}
	if resp.CACertificate != "" && uc.keyManager.CAPath != "" {
		if err = uc.keyManager.SaveCA(uc.keyManager.CAPath, []byte(resp.CACertificate)); err != nil {
			return fmt.Errorf("failed to save CA: %w", err)
		}
	}
	if resp.PublicKey != "" && uc.keyManager.LicenseKeyPath != "" {
		if err = uc.keyManager.SaveLicenseKey([]byte(resp.PublicKey)); err != nil {
			return fmt.Errorf("failed to save license public key: %w", err)
		}
		// Update TokenService dynamically
		if uc.tokenService != nil {
			if err := uc.tokenService.UpdatePublicKey(resp.PublicKey); err != nil {
				return fmt.Errorf("failed to update public key in memory: %w", err)
			}
		} else {
			ts, err := services.NewTokenService(resp.PublicKey)
			if err != nil {
				return fmt.Errorf("failed to initialize token service: %w", err)
			}
			uc.tokenService = ts
		}
	}

	// 4. Reload Client
	if err = uc.licenseClient.Reload(uc.keyManager.CertPath, uc.keyManager.KeyPath, uc.keyManager.CAPath); err != nil {
		return fmt.Errorf("failed to reload client: %w", err)
	}

	// 5. Activate License (Get Token) using INN
	fp, err := uc.GetSystemFingerprint()
	if err != nil {
		return fmt.Errorf("failed to generate fingerprint: %w", err)
	}

	actResp, err := uc.licenseClient.Activate(ctx, inn, fp)
	if err != nil {
		return fmt.Errorf("activation failed: %w", err)
	}

	// Save Token
	if err = uc.UpdateLicense(ctx, actResp.Token, inn); err != nil {
		return fmt.Errorf("failed to save license info: %w", err)
	}

	return nil
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
		OrgName:        ls.OrgName,
		INN:            ls.INN,
		ActivationDate: ls.ActivationDate,
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

// GetSystemFingerprint returns the current machine's fingerprint
func (uc *DeviceUseCase) GetSystemFingerprint() (string, error) {
	return fingerprint.Generate(uc.fingerprintSalt)
}

// RequestLicense initiates the license activation flow
func (uc *DeviceUseCase) RequestLicense(ctx context.Context, inn string) error {
	// 1. Check if already activated with valid token
	if uc.activationRepo != nil {
		tokenString, err := uc.activationRepo.GetActiveToken(ctx)
		if err == nil && tokenString != "" {
			// Verify existing token
			if uc.tokenService != nil {
				// Use new variable for error to avoid shadowing
				claims, tokenErr := uc.tokenService.VerifyToken(tokenString)
				if tokenErr == nil {
					// Check expiration
					if claims.ExpiresAt == nil || claims.ExpiresAt.Time.After(time.Now()) {
						return fmt.Errorf("license already activated")
					}
				}
			}
		}
	}

	// 2. Register first (CSR Flow)
	if err := uc.RegisterInstance(ctx, inn); err != nil {
		return fmt.Errorf("failed to register instance: %w", err)
	}

	return nil
}

// UpdateLicense validates and updates the license token (for manual/offline use)
func (uc *DeviceUseCase) UpdateLicense(ctx context.Context, tokenString string, inn string) error {
	if uc.tokenService == nil {
		return fmt.Errorf("token service not initialized")
	}

	// 1. Verify signature and get claims
	claims, err := uc.tokenService.VerifyToken(tokenString)
	if err != nil {
		return fmt.Errorf("invalid token: %w", err)
	}

	// 2. Verify fingerprint
	currentFP, err := uc.GetSystemFingerprint()
	if err != nil {
		return fmt.Errorf("failed to generate fingerprint: %w", err)
	}

	if claims.FingerprintHash != currentFP {
		return fmt.Errorf("fingerprint mismatch: system=%s token=%s", currentFP, claims.FingerprintHash)
	}

	// 3. Save to DB
	expiresAt := time.Time{}
	if claims.ExpiresAt != nil {
		expiresAt = claims.ExpiresAt.Time
	}

	var activationDate time.Time
	if claims.ActivationDate != "" {
		if t, err := time.Parse(time.RFC3339, claims.ActivationDate); err == nil {
			activationDate = t
		}
	}

	// If inn is empty, try to get it from DB if it exists
	if inn == "" {
		if key, err := uc.activationRepo.GetActiveLicenseKey(ctx); err == nil {
			inn = key
		}
	}

	return uc.activationRepo.UpdateLicense(ctx, tokenString, currentFP, claims.MaxAgents, claims.Status, expiresAt, claims.OrgName, claims.INN, activationDate, inn)
}

// GetDeviceStats — просто счётчик
func (uc *DeviceUseCase) GetDeviceStats(ctx context.Context) (int, error) {
	acts, err := uc.activationRepo.GetActivations(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get activations: %w", err)
	}
	return len(acts), nil
}

// RefreshLicense checks with the server for any license updates
func (uc *DeviceUseCase) RefreshLicense(ctx context.Context) error {
	// 1. Get current active token
	tokenString, err := uc.activationRepo.GetActiveToken(ctx)
	if err != nil {
		return fmt.Errorf("failed to get active license token: %w", err)
	}

	// 2. Parse token to verify it's valid structurally (even if expired)
	_, err = uc.tokenService.VerifyToken(tokenString)
	if err != nil {
		// If invalid, we still might want to refresh if we have the license key
		// But let's proceed
	}

	// 3. Get LicenseKey
	inn, err := uc.activationRepo.GetActiveLicenseKey(ctx)
	if err != nil || inn == "" {
		return fmt.Errorf("failed to get active license key: %w", err)
	}

	// 4. Get system fingerprint
	fp, err := uc.GetSystemFingerprint()
	if err != nil {
		return fmt.Errorf("failed to generate fingerprint: %w", err)
	}

	if uc.licenseClient == nil {
		return fmt.Errorf("license client not initialized")
	}

	// 5. Call server
	resp, err := uc.licenseClient.Activate(ctx, inn, fp)
	if err != nil {
		return fmt.Errorf("failed to refresh license via server: %w", err)
	}

	// 6. Update license in DB
	return uc.UpdateLicense(ctx, resp.Token, inn)
}
