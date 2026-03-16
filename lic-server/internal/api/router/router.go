package router

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/deymonster/lic-server/internal/core/license"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type Router struct {
	svc *license.Service
}

func NewRouter(svc *license.Service) *chi.Mux {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	api := &Router{svc: svc}

	r.Route("/v1", func(r chi.Router) {
		r.Post("/register", api.HandleRegister)
		r.Post("/activate", api.HandleActivate)
		// r.Get("/status", api.HandleStatus)
	})

	return r
}

// respondError sends a JSON error response
func respondError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

type RegisterRequest struct {
	INN string `json:"inn"`
	CSR string `json:"csr"`
}

type RegisterResponse struct {
	Certificate   string `json:"certificate"`
	CACertificate string `json:"ca_certificate"`
	PublicKey     string `json:"public_key"`
}

func (api *Router) HandleRegister(w http.ResponseWriter, r *http.Request) {
	// 1. Parse Request
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondError(w, http.StatusBadRequest, "failed to read body")
		return
	}

	var req RegisterRequest
	if jsonErr := json.Unmarshal(body, &req); jsonErr != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}

	if req.INN == "" || req.CSR == "" {
		respondError(w, http.StatusBadRequest, "inn and csr are required")
		return
	}

	// 2. Call Service
	certPEM, caPEM, pubKeyPEM, err := api.svc.RegisterInstance(r.Context(), req.INN, []byte(req.CSR))
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			respondError(w, http.StatusNotFound, "license not found for this INN")
		} else {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("registration failed: %v", err))
		}
		return
	}

	fmt.Printf("DEBUG: Register response: CertLen=%d, CALen=%d, PubKeyLen=%d\n", len(certPEM), len(caPEM), len(pubKeyPEM))

	// 3. Return Response
	resp := RegisterResponse{
		Certificate:   string(certPEM),
		CACertificate: string(caPEM),
		PublicKey:     string(pubKeyPEM),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

type ActivateRequest struct {
	INN         string `json:"inn"`
	Fingerprint string `json:"fingerprint"`
	Version     string `json:"version"`
}

type ActivateResponse struct {
	Token string `json:"token"`
}

func (api *Router) HandleActivate(w http.ResponseWriter, r *http.Request) {
	// 1. Parse Request
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondError(w, http.StatusBadRequest, "failed to read body")
		return
	}

	var req ActivateRequest
	if jsonErr := json.Unmarshal(body, &req); jsonErr != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return
	}

	if req.INN == "" || req.Fingerprint == "" {
		respondError(w, http.StatusBadRequest, "inn and fingerprint are required")
		return
	}

	// 2. Call Service
	token, err := api.svc.ActivateInstance(r.Context(), req.INN, req.Fingerprint, req.Version)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			respondError(w, http.StatusNotFound, "license not found for this INN")
		} else {
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("activation failed: %v", err))
		}
		return
	}

	// 3. Return Response
	resp := ActivateResponse{
		Token: token,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
