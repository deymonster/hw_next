package router

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/deymonster/lic-server/internal/storage/sqlite"
	"github.com/go-chi/chi/v5"
)

func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func (api *Router) registerAdminRoutes(r chi.Router) {
	r.Get("/licenses", api.handleGetAllLicenses)
	r.Post("/licenses", api.handleCreateLicense)
	r.Put("/licenses/{inn}/details", api.handleUpdateLicenseDetails)
	r.Put("/licenses/{inn}/status", api.handleUpdateLicenseStatus)
	r.Get("/tokens", api.handleGetAllTokens)
	r.Post("/tokens", api.handleCreateToken)
	r.Get("/audit", api.handleGetAuditEvents)
}

func (api *Router) handleGetAllLicenses(w http.ResponseWriter, r *http.Request) {
	licenses, err := api.svc.GetAllLicenses(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to get licenses")
		return
	}
	if licenses == nil {
		licenses = make([]*sqlite.License, 0)
	}
	respondJSON(w, http.StatusOK, licenses)
}

type createLicenseReq struct {
	INN          string `json:"inn"`
	Organization string `json:"organization"`
	MaxSlots     int    `json:"max_slots"`
}

func (api *Router) handleCreateLicense(w http.ResponseWriter, r *http.Request) {
	var req createLicenseReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if req.INN == "" || req.Organization == "" || req.MaxSlots <= 0 {
		respondError(w, http.StatusBadRequest, "Missing required fields")
		return
	}

	err := api.svc.CreateLicense(r.Context(), req.INN, req.Organization, req.MaxSlots)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create license")
		return
	}

	// Auto-generate a 1-year enrollment token for the new license
	token, tokenErr := api.svc.CreateEnrollmentToken(r.Context(), req.INN, 8760*time.Hour)
	if tokenErr != nil {
		// Log but don't fail the license creation request
		respondJSON(w, http.StatusCreated, map[string]string{
			"message": "License created successfully, but failed to auto-generate token",
		})
		return
	}

	respondJSON(w, http.StatusCreated, map[string]string{
		"message": "License created successfully",
		"token":   token,
	})
}

type updateLicenseDetailsReq struct {
	Organization string `json:"organization"`
	MaxSlots     int    `json:"max_slots"`
}

func (api *Router) handleUpdateLicenseDetails(w http.ResponseWriter, r *http.Request) {
	inn := chi.URLParam(r, "inn")
	if inn == "" {
		respondError(w, http.StatusBadRequest, "Missing INN")
		return
	}

	var req updateLicenseDetailsReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if req.Organization == "" || req.MaxSlots <= 0 {
		respondError(w, http.StatusBadRequest, "Missing required fields")
		return
	}

	err := api.svc.UpdateLicenseDetails(r.Context(), inn, req.Organization, req.MaxSlots)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update license details")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "License updated successfully"})
}

type updateLicenseStatusReq struct {
	Status string `json:"status"` // "active", "revoked", "suspended"
}

func (api *Router) handleUpdateLicenseStatus(w http.ResponseWriter, r *http.Request) {
	inn := chi.URLParam(r, "inn")
	if inn == "" {
		respondError(w, http.StatusBadRequest, "Missing INN")
		return
	}

	var req updateLicenseStatusReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	err := api.svc.UpdateLicenseStatus(r.Context(), inn, req.Status)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update status")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Status updated successfully"})
}

func (api *Router) handleGetAllTokens(w http.ResponseWriter, r *http.Request) {
	tokens, err := api.svc.GetAllEnrollmentTokens(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to get tokens")
		return
	}
	if tokens == nil {
		tokens = make([]*sqlite.EnrollmentToken, 0)
	}
	respondJSON(w, http.StatusOK, tokens)
}

type createTokenReq struct {
	INN string `json:"inn"`
	TTL int    `json:"ttl_hours"`
}

func (api *Router) handleCreateToken(w http.ResponseWriter, r *http.Request) {
	var req createTokenReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if req.INN == "" || req.TTL <= 0 {
		respondError(w, http.StatusBadRequest, "Missing required fields")
		return
	}

	ttl := time.Duration(req.TTL) * time.Hour
	token, err := api.svc.CreateEnrollmentToken(r.Context(), req.INN, ttl)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create token")
		return
	}

	respondJSON(w, http.StatusCreated, map[string]string{"token": token})
}

func (api *Router) handleGetAuditEvents(w http.ResponseWriter, r *http.Request) {
	events, err := api.svc.GetAllAuditEvents(r.Context(), 100) // Limit to 100 for now
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to get audit events")
		return
	}
	if events == nil {
		events = make([]*sqlite.AuditEvent, 0)
	}
	respondJSON(w, http.StatusOK, events)
}
