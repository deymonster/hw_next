package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/deymonster/li-server/internal/services"
)

type ActivationRequest struct {
	INN         string `json:"inn"`
	Fingerprint string `json:"fingerprint"`
	Version     string `json:"version"`
}

type ActivationResponse struct {
	Token string `json:"token"`
}

type ActivationHandler struct {
	tokenService *services.TokenService
}

func NewActivationHandler(tokenService *services.TokenService) *ActivationHandler {
	return &ActivationHandler{
		tokenService: tokenService,
	}
}

func (h *ActivationHandler) Activate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. Декодируем запрос
	var req ActivationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 2. Логируем (в будущем здесь будет проверка в БД)
	clientCN := "unknown"
	if len(r.TLS.PeerCertificates) > 0 {
		clientCN = r.TLS.PeerCertificates[0].Subject.CommonName
	}
	log.Printf("[Activation] From: %s | INN: %s | FP: %s", clientCN, req.INN, req.Fingerprint)

	// 3. Генерируем реальный JWT
	token, err := h.tokenService.GenerateToken(req.INN, req.Fingerprint)
	if err != nil {
		log.Printf("Failed to generate token: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	resp := ActivationResponse{
		Token: token,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
