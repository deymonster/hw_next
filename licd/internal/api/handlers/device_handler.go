package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/deymonster/licd/internal/application/usecases"
)

// DeviceHandler обрабатывает HTTP запросы для устройств
type DeviceHandler struct {
	deviceUseCase *usecases.DeviceUseCase
}

// NewDeviceHandler создает новый handler
func NewDeviceHandler(deviceUseCase *usecases.DeviceUseCase) *DeviceHandler {
	return &DeviceHandler{
		deviceUseCase: deviceUseCase,
	}
}

// CreateDevice создает новое устройство
// POST /api/devices
func (h *DeviceHandler) CreateDevice(w http.ResponseWriter, r *http.Request) {
	// Структура для входящих данных
	type CreateDeviceRequest struct {
		AgentKey string `json:"agent_key"`
		IP       string `json:"ip"`
		Port     int    `json:"port"`
	}

	// Читаем JSON из запроса
	var req CreateDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("ERROR: Failed to decode request body: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Создаем устройство через Use Case
	log.Printf("Creating device: agent_key=%s, ip=%s, port=%d", req.AgentKey, req.IP, req.Port)
	device, err := h.deviceUseCase.CreateDevice(r.Context(), req.AgentKey, req.IP, req.Port)
	if err != nil {
		log.Printf("ERROR: Failed to create device: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Возвращаем созданное устройство
	log.Printf("Device created successfully: id=%s", device.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(device)
}

// GetActiveDevices возвращает все активные устройства
// GET /api/devices/active
func (h *DeviceHandler) GetActiveDevices(w http.ResponseWriter, r *http.Request) {
	devices, err := h.deviceUseCase.GetActiveDevices(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(devices)
}

// GetPrometheusTargets возвращает targets для Prometheus
// GET /api/prometheus/targets
func (h *DeviceHandler) GetPrometheusTargets(w http.ResponseWriter, r *http.Request) {
	targets, err := h.deviceUseCase.GetPrometheusTargets(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(targets)
}
