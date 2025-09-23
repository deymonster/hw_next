package router

import (
	"net/http"

	"github.com/deymonster/licd/internal/api/handlers"
	"github.com/deymonster/licd/internal/api/middleware"
)

// Router содержит все маршруты приложения
type Router struct {
	mux *http.ServeMux
}

// NewRouter создает новый router
func NewRouter() *Router {
	r := &Router{
		mux: http.NewServeMux(),
	}
	r.setupBaseRoutes()
	return r
}

// Handler возвращает HTTP handler с middleware
func (r *Router) Handler() http.Handler {
	// порядок важен: CORS должен быть снаружи
	h := middleware.Logger(r.mux)
	h = middleware.CORS(h)
	return h
}

// базовые (health и опционально OPTIONS)
func (r *Router) setupBaseRoutes() {
	healthHandler := handlers.NewHealthHandler()
	r.mux.HandleFunc("GET /health", healthHandler.Health)
	r.mux.HandleFunc("GET /healthz", healthHandler.Healthz)
	r.mux.HandleFunc("GET /version", healthHandler.Version)

	// На случай отсутствия обработки preflight в CORS-middleware
	r.mux.HandleFunc("OPTIONS /", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
}

// SetupDeviceRoutes регистрирует маршруты для устройств
func (r *Router) SetupDeviceRoutes(deviceHandler *handlers.DeviceHandler) {
	r.mux.HandleFunc("POST /api/devices", deviceHandler.CreateDevice)
	r.mux.HandleFunc("GET /api/devices/active", deviceHandler.GetActiveDevices)

	// УБРАНО: /api/prometheus/targets — теперь отдаём только /sd/targets
	// r.mux.HandleFunc("GET /api/prometheus/targets", deviceHandler.GetPrometheusTargets)
}

// SetupLicenseRoutes регистрирует маршруты для лицензий
func (r *Router) SetupLicenseRoutes(licenseHandler *handlers.LicenseHandler) {
	r.mux.HandleFunc("GET /license/status", licenseHandler.GetLicenseStatus)
	r.mux.HandleFunc("POST /license/activate", licenseHandler.ActivateDevice)
	r.mux.HandleFunc("POST /license/activate-batch", licenseHandler.ActivateBatchDevices)
	r.mux.HandleFunc("POST /license/deactivate", licenseHandler.DeactivateDevice)
}

// SetupPrometheusRoutes регистрирует маршруты для Prometheus SD
func (r *Router) SetupPrometheusRoutes(prometheusHandler *handlers.PrometheusHandler) {
	r.mux.HandleFunc("GET /sd/targets", prometheusHandler.GetTargets)
}

// GetMux возвращает http.ServeMux
func (r *Router) GetMux() *http.ServeMux {
	return r.mux
}
