package handlers

import (
	"encoding/json"
	"log"
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
	log.Printf("DEBUG: ActivateDevice called. Method: %s, URL: %s", r.Method, r.URL.String())
	if r.Method != http.MethodPost {
		log.Printf("ERROR: Invalid method %s for ActivateDevice", r.Method)
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	type ActivateRequest struct {
		DeviceID  string `json:"deviceId"`
		AgentKey  string `json:"agentKey"`
		IPAddress string `json:"ipAddress"`
		Port      int    `json:"port"`
	}

	var req ActivateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("ERROR: Failed to decode request: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if req.AgentKey == "" || req.IPAddress == "" {
		log.Printf("ERROR: Missing required fields: agentKey=%s, ipAddress=%s", req.AgentKey, req.IPAddress)
		http.Error(w, "Missing agentKey or ipAddress", http.StatusBadRequest)
		return
	}
	if req.Port == 0 {
		req.Port = 9182
	}

	log.Printf("INFO: Activating device: agentKey=%s, ip=%s, port=%d", req.AgentKey, req.IPAddress, req.Port)
	device, err := h.deviceUseCase.CreateDevice(r.Context(), req.AgentKey, req.IPAddress, req.Port)
	if err != nil {
		// Лицензионный лимит
		if strings.Contains(err.Error(), "license limit exceeded") {
			log.Printf("WARN: License limit exceeded for agentKey=%s", req.AgentKey)
			http.Error(w, "License limit exceeded", http.StatusForbidden)
			return
		}
		log.Printf("ERROR: Failed to activate device: %v", err)
		http.Error(w, "Failed to activate device: "+err.Error(), http.StatusInternalServerError)
		return
	}

	resp := map[string]any{
		"success": true,
		"ok":      true, // Frontend compatibility
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

// RegisterInstance registers the licd instance with the license server using a license key
// POST /license/register
func (h *LicenseHandler) RegisterInstance(w http.ResponseWriter, r *http.Request) {
	type RegisterRequest struct {
		INN        string `json:"inn"`
		LicenseKey string `json:"licenseKey"`
		Token      string `json:"token"`
	}
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("ERROR: Failed to decode RegisterInstance request: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Support both INN and licenseKey (frontend sends licenseKey)
	identifier := req.INN
	if identifier == "" {
		identifier = req.LicenseKey
	}

	if identifier == "" {
		log.Printf("ERROR: Missing INN or licenseKey in request")
		http.Error(w, "Missing INN or licenseKey", http.StatusBadRequest)
		return
	}

	log.Printf("INFO: Registering instance with identifier: %s", identifier)
	if err := h.deviceUseCase.RegisterInstance(r.Context(), identifier, req.Token); err != nil {
		log.Printf("ERROR: Registration failed: %v", err)

		w.Header().Set("Content-Type", "application/json")

		statusCode := http.StatusInternalServerError
		errorMsg := err.Error()
		errorCode := "UNKNOWN_ERROR"

		if strings.Contains(errorMsg, "license not found") {
			statusCode = http.StatusNotFound
			errorCode = "LICENSE_NOT_FOUND"
		} else if strings.Contains(errorMsg, "unavailable") {
			statusCode = http.StatusServiceUnavailable
			errorCode = "LICENSE_SERVER_UNAVAILABLE"
		} else if strings.Contains(errorMsg, "inn and csr are required") {
			statusCode = http.StatusBadRequest
			errorCode = "INN_REQUIRED"
		}

		w.WriteHeader(statusCode)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error":   errorCode,
			"message": errorMsg,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"status":  "registered",
		"message": "Instance registered successfully. Certificates saved.",
	})
}

// UpdateLicense updates the license token manually (admin/offline)
// POST /license/update
func (h *LicenseHandler) UpdateLicense(w http.ResponseWriter, r *http.Request) {
	type Request struct {
		Token string `json:"token"`
	}
	var req Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if req.Token == "" {
		http.Error(w, "Missing token", http.StatusBadRequest)
		return
	}

	if err := h.deviceUseCase.UpdateLicense(r.Context(), req.Token, ""); err != nil {
		if strings.Contains(err.Error(), "invalid token") || strings.Contains(err.Error(), "fingerprint mismatch") {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "Failed to update license: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

// RefreshLicense checks with the server for license updates
// POST /license/refresh
func (h *LicenseHandler) RefreshLicense(w http.ResponseWriter, r *http.Request) {
	if err := h.deviceUseCase.RefreshLicense(r.Context()); err != nil {
		if strings.Contains(err.Error(), "no active license") {
			http.Error(w, "No active license to refresh", http.StatusNotFound)
			return
		}
		http.Error(w, "Refresh failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "refreshed",
		"message": "License updated from server",
	})
}
