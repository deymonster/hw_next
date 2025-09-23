package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/deymonster/licd/internal/application/usecases"
)

type PrometheusHandler struct {
	deviceUseCase *usecases.DeviceUseCase
}

func NewPrometheusHandler(deviceUseCase *usecases.DeviceUseCase) *PrometheusHandler {
	return &PrometheusHandler{deviceUseCase: deviceUseCase}
}

// GET /sd/targets
func (h *PrometheusHandler) GetTargets(w http.ResponseWriter, r *http.Request) {
	targets, err := h.deviceUseCase.GetPrometheusTargets(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp := make([]map[string]any, 0, len(targets))
	for _, t := range targets {
		item := map[string]any{
			"targets": []string{t.Address},
		}
		// добавим labels как ты просил
		if len(t.Labels) > 0 {
			item["labels"] = t.Labels
		}
		resp = append(resp, item)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
