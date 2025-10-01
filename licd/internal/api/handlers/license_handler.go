package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/deymonster/licd/internal/application/usecases"
)

// LicenseHandler обрабатывает HTTP запросы для лицензий
type LicenseHandler struct {
	deviceUseCase *usecases.DeviceUseCase
}

// NewLicenseHandler создает новый license handler
func NewLicenseHandler(deviceUseCase *usecases.DeviceUseCase) *LicenseHandler {
	return &LicenseHandler{
		deviceUseCase: deviceUseCase,
	}
}

// GetLicenseStatus возвращает статус лицензии
// GET /license/status
func (h *LicenseHandler) GetLicenseStatus(w http.ResponseWriter, r *http.Request) {
	status, err := h.deviceUseCase.GetLicenseStatus(r.Context())
	if err != nil {
		http.Error(w, "failed to get license status: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(status)
}

// ActivateDevice активирует устройство
// POST /license/activate
func (h *LicenseHandler) ActivateDevice(w http.ResponseWriter, r *http.Request) {
	type ActivateRequest struct {
		DeviceID  string `json:"deviceId"`
		AgentKey  string `json:"agentKey"`
		IPAddress string `json:"ipAddress"`
		Port      int    `json:"port"`
	}

	var req ActivateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if req.AgentKey == "" || req.IPAddress == "" {
		http.Error(w, "Missing agentKey or ipAddress", http.StatusBadRequest)
		return
	}
	if req.Port == 0 {
		req.Port = 9182
	}

	device, err := h.deviceUseCase.CreateDevice(r.Context(), req.AgentKey, req.IPAddress, req.Port)
	if err != nil {
		// Лицензионный лимит
		if strings.Contains(err.Error(), "license limit exceeded") {
			http.Error(w, "License limit exceeded", http.StatusForbidden)
			return
		}
		http.Error(w, "Failed to activate device: "+err.Error(), http.StatusInternalServerError)
		return
	}

	resp := map[string]any{
		"success": true,
		"device":  device,
		"message": "Device activated successfully",
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// DeactivateDevice деактивирует устройство
// POST /license/deactivate
func (h *LicenseHandler) DeactivateDevice(w http.ResponseWriter, r *http.Request) {
	type DeactivateRequest struct {
		DeviceID string `json:"deviceId"`
	}

	var req DeactivateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if req.DeviceID == "" {
		http.Error(w, "Missing deviceId", http.StatusBadRequest)
		return
	}

	// Проверяем, что устройство есть (опционально)
	if _, err := h.deviceUseCase.GetDevice(r.Context(), req.DeviceID); err != nil {
		http.Error(w, "Device not found", http.StatusNotFound)
		return
	}

	if err := h.deviceUseCase.DeleteDevice(r.Context(), req.DeviceID); err != nil {
		http.Error(w, "Failed to deactivate device: "+err.Error(), http.StatusInternalServerError)
		return
	}

	resp := map[string]any{
		"success": true,
		"message": "Device deactivated successfully",
		"device":  req.DeviceID,
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// ActivateBatchDevices активирует несколько устройств одновременно
// POST /license/activate-batch
func (h *LicenseHandler) ActivateBatchDevices(w http.ResponseWriter, r *http.Request) {
	type BatchActivateRequest struct {
		Devices []struct {
			DeviceID  string `json:"deviceId"`
			AgentKey  string `json:"agentKey"`
			IPAddress string `json:"ipAddress"`
			Port      int    `json:"port"`
		} `json:"devices"`
	}

	var req BatchActivateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if len(req.Devices) == 0 {
		http.Error(w, "No devices provided", http.StatusBadRequest)
		return
	}

	// Предварительная проверка лимита
	status, err := h.deviceUseCase.GetLicenseStatus(r.Context())
	if err != nil {
		http.Error(w, "failed to get license status: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if status.RemainingSlots < len(req.Devices) {
		resp := map[string]any{
			"ok":             false,
			"reason":         "limit_reached",
			"message":        "Adding these devices would exceed license limit",
			"current_active": status.UsedSlots,
			"max_devices":    status.MaxSlots,
			"requested":      len(req.Devices),
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(resp)
		return
	}

	type DeviceResult struct {
		DeviceID  string      `json:"deviceId"`
		IPAddress string      `json:"ipAddress"`
		Success   bool        `json:"success"`
		Device    interface{} `json:"device,omitempty"`
		Error     string      `json:"error,omitempty"`
	}

	results := make([]DeviceResult, 0, len(req.Devices))
	successCount := 0

	for _, d := range req.Devices {
		res := DeviceResult{
			DeviceID:  d.DeviceID,
			IPAddress: d.IPAddress,
		}

		port := d.Port
		if port == 0 {
			port = 9182
		}

		device, err := h.deviceUseCase.CreateDevice(r.Context(), d.AgentKey, d.IPAddress, port)
		if err != nil {
			if strings.Contains(err.Error(), "license limit exceeded") {
				res.Success = false
				res.Error = "License limit reached"
			} else {
				res.Success = false
				res.Error = err.Error()
			}
			results = append(results, res)
			continue
		}

		res.Success = true
		res.Device = device
		results = append(results, res)
		successCount++
	}

	resp := map[string]any{
		"ok":            true,
		"success_count": successCount,
		"total_count":   len(req.Devices),
		"results":       results,
		"message":       "Batch activation completed",
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
