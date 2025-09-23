package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/deymonster/licd/internal/version"
)

// HealthResponse структура ответа health check
type HealthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version"`
}

// HealthHandler обработчик для health check
type HealthHandler struct{}

// NewHealthHandler создает новый health handler
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Health возвращает статус здоровья сервиса
func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	response := HealthResponse{
		Status:    "ok",
		Timestamp: time.Now(),
		Version:   version.Version,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// Healthz простой health check для Kubernetes
func (h *HealthHandler) Healthz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

// Новый эндпоинт: GET /version
type VersionInfo struct {
	Version string `json:"version"`
	Commit  string `json:"commit"`
	Date    string `json:"date"`
}

func (h *HealthHandler) Version(w http.ResponseWriter, r *http.Request) {
	info := VersionInfo{
		Version: version.Version,
		Commit:  version.Commit,
		Date:    version.Date,
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(info)
}
