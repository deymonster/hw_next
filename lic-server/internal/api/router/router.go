package router

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

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

type RegisterRequest struct {
	INN string `json:"inn"`
	CSR string `json:"csr"`
}

type RegisterResponse struct {
	Certificate   string `json:"certificate"`
	CACertificate string `json:"ca_certificate"`
}

func (api *Router) HandleRegister(w http.ResponseWriter, r *http.Request) {
	// 1. Parse Request
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}

	var req RegisterRequest
	if jsonErr := json.Unmarshal(body, &req); jsonErr != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if req.INN == "" || req.CSR == "" {
		http.Error(w, "inn and csr are required", http.StatusBadRequest)
		return
	}

	// 2. Call Service
	certPEM, caPEM, err := api.svc.RegisterInstance(r.Context(), req.INN, []byte(req.CSR))
	if err != nil {
		http.Error(w, fmt.Sprintf("registration failed: %v", err), http.StatusInternalServerError)
		return
	}

	// 3. Return Response
	resp := RegisterResponse{
		Certificate:   string(certPEM),
		CACertificate: string(caPEM),
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
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}

	var req ActivateRequest
	if jsonErr := json.Unmarshal(body, &req); jsonErr != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if req.INN == "" || req.Fingerprint == "" {
		http.Error(w, "inn and fingerprint are required", http.StatusBadRequest)
		return
	}

	// 2. Call Service
	token, err := api.svc.ActivateInstance(r.Context(), req.INN, req.Fingerprint, req.Version)
	if err != nil {
		http.Error(w, fmt.Sprintf("activation failed: %v", err), http.StatusInternalServerError)
		return
	}

	// 3. Return Response
	resp := ActivateResponse{
		Token: token,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
