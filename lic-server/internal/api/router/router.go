package router

import (
	"crypto/sha256"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/deymonster/lic-server/internal/core/license"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"golang.org/x/time/rate"
)

type Router struct {
	svc      *license.Service
	rl       *rateLimiter
	adminKey string
}

func NewRouter(svc *license.Service, adminKey string) *chi.Mux {
	r := chi.NewRouter()
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	api := &Router{
		svc:      svc,
		rl:       newRateLimiter(),
		adminKey: adminKey,
	}

	// API v1 (Client)
	r.Route("/v1", func(r chi.Router) {
		r.With(api.RateLimit).Post("/register", api.HandleRegister)

		// Protected endpoints requiring mTLS
		r.Group(func(r chi.Router) {
			r.Use(api.RequireMTLS)
			r.Post("/activate", api.HandleActivate)
			r.Get("/heartbeat", api.HandleHeartbeat)
		})
	})

	// Admin API
	r.Route("/api/admin", func(r chi.Router) {
		r.Use(api.corsMiddleware)
		r.Use(api.adminAuthMiddleware)
		api.registerAdminRoutes(r)
	})

	return r
}

func (api *Router) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*") // In production, restrict this to your frontend domain
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (api *Router) adminAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Expecting "Bearer <AdminAPIKey>" or simply checking a custom header like X-Admin-Key
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondError(w, http.StatusUnauthorized, "Missing Authorization header")
			return
		}

		// Simple token check (e.g. "Bearer admin-secret-key-change-me")
		// In a real app, you might compare this with a config value.
		// For now, let's hardcode a check or inject it via Service/Config.
		// Since Config isn't directly in Router, we could pass the admin key when creating Router.
		// But let's assume we can fetch it or pass it.
		// Actually, I should update NewRouter to accept the admin key.
		// For now, I'll put a placeholder or get it from env.
		expectedKey := api.adminKey
		if expectedKey == "" {
			expectedKey = "admin-secret-key-change-me" // fallback
		}

		if authHeader != "Bearer "+expectedKey {
			respondError(w, http.StatusUnauthorized, "Invalid admin key")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Rate Limiter Implementation
type rateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
}

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

func newRateLimiter() *rateLimiter {
	return &rateLimiter{
		visitors: make(map[string]*visitor),
	}
}

func (rl *rateLimiter) getVisitor(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		// 1 request per second, burst of 3
		limiter := rate.NewLimiter(1, 3)
		rl.visitors[ip] = &visitor{limiter, time.Now()}
		return limiter
	}
	v.lastSeen = time.Now()
	return v.limiter
}

func (api *Router) RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)
		limiter := api.rl.getVisitor(ip)
		if !limiter.Allow() {
			respondError(w, http.StatusTooManyRequests, "rate limit exceeded")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	// Check X-Real-IP
	xrip := r.Header.Get("X-Real-IP")
	if xrip != "" {
		return xrip
	}
	// Fallback to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// RequireMTLS enforces mTLS authentication
func (api *Router) RequireMTLS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)

		// 1. Check if TLS is present
		if r.TLS == nil {
			_ = api.svc.LogAudit(r.Context(), "access_denied_mtls", "unknown", ip, "missing_tls")
			respondError(w, http.StatusForbidden, "TLS required")
			return
		}

		// 2. Check if peer certificates are present
		if len(r.TLS.PeerCertificates) == 0 {
			_ = api.svc.LogAudit(r.Context(), "access_denied_mtls", "unknown", ip, "missing_client_cert")
			respondError(w, http.StatusForbidden, "client certificate required")
			return
		}

		// 3. Check if certificate chain is verified
		if len(r.TLS.VerifiedChains) == 0 {
			_ = api.svc.LogAudit(r.Context(), "access_denied_mtls", "unknown", ip, "cert_verification_failed")
			respondError(w, http.StatusForbidden, "client certificate verification failed")
			return
		}

		cert := r.TLS.PeerCertificates[0]

		// 4. Check Common Name
		if cert.Subject.CommonName != "licd-client" {
			_ = api.svc.LogAudit(r.Context(), "access_denied_mtls", "unknown", ip, fmt.Sprintf("invalid_cn: %s", cert.Subject.CommonName))
			respondError(w, http.StatusForbidden, "invalid client certificate common name")
			return
		}

		// 5. Check ExtKeyUsage (ClientAuth)
		hasClientAuth := false
		for _, usage := range cert.ExtKeyUsage {
			if usage == x509.ExtKeyUsageClientAuth {
				hasClientAuth = true
				break
			}
		}
		if !hasClientAuth {
			_ = api.svc.LogAudit(r.Context(), "access_denied_mtls", "unknown", ip, "missing_client_auth_usage")
			respondError(w, http.StatusForbidden, "client certificate missing ClientAuth usage")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// respondError sends a JSON error response
func respondError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

type RegisterRequest struct {
	INN   string `json:"inn"`
	CSR   string `json:"csr"`
	Token string `json:"token"`
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

	if req.INN == "" || req.CSR == "" || req.Token == "" {
		respondError(w, http.StatusBadRequest, "inn, csr and token are required")
		return
	}

	// 2. Call Service
	ip := getClientIP(r)
	certPEM, caPEM, pubKeyPEM, err := api.svc.RegisterInstance(r.Context(), req.INN, req.Token, []byte(req.CSR), ip)
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

func (api *Router) HandleHeartbeat(w http.ResponseWriter, r *http.Request) {
	// 1. Get Cert Fingerprint
	certFingerprint := ""
	if r.TLS != nil && len(r.TLS.PeerCertificates) > 0 {
		certFingerprint = fmt.Sprintf("%x", sha256.Sum256(r.TLS.PeerCertificates[0].Raw))
	} else {
		// Should be caught by RequireMTLS, but safe check
		respondError(w, http.StatusForbidden, "client certificate required")
		return
	}

	// 2. Verify License
	ip := getClientIP(r)
	if err := api.svc.VerifyLicenseByCert(r.Context(), certFingerprint, ip); err != nil {
		respondError(w, http.StatusForbidden, err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
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

	// Extract certificate fingerprint if present
	certFingerprint := ""
	if r.TLS != nil && len(r.TLS.PeerCertificates) > 0 {
		certFingerprint = fmt.Sprintf("%x", sha256.Sum256(r.TLS.PeerCertificates[0].Raw))
	}

	// 2. Call Service
	ip := getClientIP(r)
	token, err := api.svc.ActivateInstance(r.Context(), req.INN, req.Fingerprint, req.Version, certFingerprint, ip)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			respondError(w, http.StatusNotFound, "license not found for this INN")
		} else if strings.Contains(err.Error(), "client certificate") && (strings.Contains(err.Error(), "bound") || strings.Contains(err.Error(), "required")) {
			respondError(w, http.StatusForbidden, err.Error())
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
