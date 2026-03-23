package integration_test

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/deymonster/lic-server/internal/api/router"
	"github.com/deymonster/lic-server/internal/core/license"
	"github.com/deymonster/lic-server/internal/infrastructure/crypto"
	"github.com/deymonster/lic-server/internal/storage/sqlite"
)

func TestAccessControlMatrix(t *testing.T) {
	// 1. Setup Infrastructure
	tempDir := t.TempDir()
	caCertPath := filepath.Join(tempDir, "ca.crt")
	caKeyPath := filepath.Join(tempDir, "ca.key")
	tokenPrivPath := filepath.Join(tempDir, "token.key")

	// Storage (In-Memory)
	store, err := sqlite.NewStorage(":memory:")
	if err != nil {
		t.Fatalf("Failed to create storage: %v", err)
	}
	defer store.Close()

	// CA Service
	caSvc, err := crypto.NewCAService(caCertPath, caKeyPath)
	if err != nil {
		t.Fatalf("Failed to create CA service: %v", err)
	}

	// Token Service
	tokenSvc, err := crypto.NewTokenService(tokenPrivPath)
	if err != nil {
		t.Fatalf("Failed to create Token service: %v", err)
	}

	// License Service
	svc := license.NewService(store, caSvc, tokenSvc, "")

	// Router
	r := router.NewRouter(svc, "test-admin-key")

	// Create TLS Server with VerifyClientCertIfGiven
	caCertPEM, err := os.ReadFile(caCertPath)
	if err != nil {
		t.Fatalf("Failed to read CA cert: %v", err)
	}
	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM(caCertPEM) {
		t.Fatalf("Failed to append CA cert to pool")
	}

	ts := httptest.NewUnstartedServer(r)
	ts.TLS = &tls.Config{
		ClientCAs:  caCertPool,
		ClientAuth: tls.VerifyClientCertIfGiven,
	}
	ts.StartTLS()
	defer ts.Close()

	// 2. Prepare Data
	ctx := context.Background()
	innA := "1111111111"
	innB := "2222222222"

	// Create Licenses
	store.CreateLicense(ctx, innA, "Org A", 10)
	store.CreateLicense(ctx, innB, "Org B", 10)

	// Create Enrollment Tokens
	tokenA, _ := store.CreateEnrollmentToken(ctx, innA, 1*time.Hour)
	// Token B is created but not used in tests directly, kept for completeness of data setup
	_, _ = store.CreateEnrollmentToken(ctx, innB, 1*time.Hour)

	// Helper to create client cert
	createClientCert := func(cn string) (*tls.Certificate, error) {
		priv, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)

		csrTemplate := x509.CertificateRequest{
			Subject: pkix.Name{CommonName: cn},
		}
		csrBytes, _ := x509.CreateCertificateRequest(rand.Reader, &csrTemplate, priv)
		csr, _ := x509.ParseCertificateRequest(csrBytes)

		certPEM, err := caSvc.SignCSR(csr)
		if err != nil {
			return nil, err
		}

		// Parse private key to PEM
		keyBytes, _ := x509.MarshalECPrivateKey(priv)
		keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyBytes})

		cert, err := tls.X509KeyPair(certPEM, keyPEM)
		return &cert, err
	}

	// Helper to make requests
	makeRequest := func(method, path string, body interface{}, cert *tls.Certificate) (int, string) {
		var bodyReader io.Reader
		if body != nil {
			b, _ := json.Marshal(body)
			bodyReader = bytes.NewReader(b)
		}

		req, _ := http.NewRequest(method, ts.URL+path, bodyReader)
		client := ts.Client()

		if cert != nil {
			// Clone the transport to safely modify TLS config
			transport := client.Transport.(*http.Transport).Clone()
			transport.TLSClientConfig.Certificates = []tls.Certificate{*cert}
			client.Transport = transport
		} else {
			// Ensure no client certs are sent (though by default none are)
			transport := client.Transport.(*http.Transport).Clone()
			transport.TLSClientConfig.Certificates = []tls.Certificate{}
			client.Transport = transport
		}

		resp, err := client.Do(req)
		if err != nil {
			return 0, err.Error()
		}
		defer resp.Body.Close()

		respBody, _ := io.ReadAll(resp.Body)
		return resp.StatusCode, string(respBody)
	}

	// Test 0: /v1/register with invalid token -> 500
	t.Run("Register with invalid token", func(t *testing.T) {
		// Generate CSR
		priv, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		csrTemplate := x509.CertificateRequest{Subject: pkix.Name{CommonName: "licd-client"}}
		csrBytes, _ := x509.CreateCertificateRequest(rand.Reader, &csrTemplate, priv)
		csrPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE REQUEST", Bytes: csrBytes})

		req := router.RegisterRequest{
			INN:   innA,
			CSR:   string(csrPEM),
			Token: "invalid-token",
		}

		code, _ := makeRequest("POST", "/v1/register", req, nil)
		if code != http.StatusInternalServerError {
			t.Errorf("Expected 500, got %d", code)
		}
	})

	// Test 1: /v1/register without client cert -> 200
	t.Run("Register without client cert", func(t *testing.T) {
		// Generate CSR
		priv, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		csrTemplate := x509.CertificateRequest{Subject: pkix.Name{CommonName: "licd-client"}}
		csrBytes, _ := x509.CreateCertificateRequest(rand.Reader, &csrTemplate, priv)
		csrPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE REQUEST", Bytes: csrBytes})

		req := router.RegisterRequest{
			INN:   innA,
			CSR:   string(csrPEM),
			Token: tokenA,
		}

		code, _ := makeRequest("POST", "/v1/register", req, nil)
		if code != http.StatusOK {
			t.Errorf("Expected 200, got %d", code)
		}
	})

	// Test 2: /v1/activate without client cert -> 401/403 (Forbidden in our case)
	t.Run("Activate without client cert", func(t *testing.T) {
		req := map[string]string{
			"inn":              innA,
			"fingerprint":      "hardware-fp",
			"version":          "1.0",
			"cert_fingerprint": "any",
		}
		code, body := makeRequest("POST", "/v1/activate", req, nil)
		if code != http.StatusForbidden {
			t.Errorf("Expected 403, got %d. Body: %s", code, body)
		}
	})

	// Test 3: /v1/activate with cert from correct CA, but without binding -> 403
	t.Run("Activate with cert but no binding", func(t *testing.T) {
		// Create a cert signed by CA but NOT registered (no binding in DB)
		cert, err := createClientCert("licd-client")
		if err != nil {
			t.Fatalf("Failed to create cert: %v", err)
		}

		req := map[string]string{
			"inn":              innA,
			"fingerprint":      "hardware-fp",
			"version":          "1.0",
			"cert_fingerprint": "any", // Server will look up by actual cert fingerprint
		}

		code, body := makeRequest("POST", "/v1/activate", req, cert)
		// Expect 403 because RequireMTLS passes (valid cert), but ActivateInstance logic checks binding

		if code != http.StatusForbidden {
			t.Errorf("Expected 403, got %d. Body: %s", code, body)
		}
	})

	// Pre-requisite for Test 4 & 5: Register a valid client (create binding)
	// We do this via Register endpoint to simulate real flow
	var certA *tls.Certificate
	var certAFingerprint string

	t.Run("Setup Binding for INN A", func(t *testing.T) {
		// New CSR
		priv, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		csrTemplate := x509.CertificateRequest{Subject: pkix.Name{CommonName: "licd-client"}}
		csrBytes, _ := x509.CreateCertificateRequest(rand.Reader, &csrTemplate, priv)
		csrPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE REQUEST", Bytes: csrBytes})

		// Token A was used in Test 1, so it is consumed!
		// Need new token.
		tokenA2, _ := store.CreateEnrollmentToken(ctx, innA, 1*time.Hour)

		req := router.RegisterRequest{
			INN:   innA,
			CSR:   string(csrPEM),
			Token: tokenA2,
		}

		code, body := makeRequest("POST", "/v1/register", req, nil)
		if code != http.StatusOK {
			t.Fatalf("Register failed: %d %s", code, body)
		}

		var resp router.RegisterResponse
		json.Unmarshal([]byte(body), &resp)

		// Parse returned cert
		block, _ := pem.Decode([]byte(resp.Certificate))
		cert, _ := x509.ParseCertificate(block.Bytes)

		// Create tls.Certificate
		keyBytes, _ := x509.MarshalECPrivateKey(priv)
		keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyBytes})
		c, _ := tls.X509KeyPair([]byte(resp.Certificate), keyPEM)
		certA = &c

		// Calculate fingerprint
		h := sha256.Sum256(cert.Raw)
		certAFingerprint = fmt.Sprintf("%x", h[:])
	})

	// Test 4: /v1/activate with cert and correct binding -> 200
	t.Run("Activate with correct binding", func(t *testing.T) {
		req := map[string]string{
			"inn":              innA,
			"fingerprint":      "hardware-fp-1",
			"version":          "1.0",
			"cert_fingerprint": certAFingerprint,
		}

		code, body := makeRequest("POST", "/v1/activate", req, certA)
		if code != http.StatusOK {
			t.Errorf("Expected 200, got %d. Body: %s", code, body)
		}

		// Check if token returned
		var resp map[string]string
		json.Unmarshal([]byte(body), &resp)
		if resp["token"] == "" {
			t.Error("Expected token in response")
		}
	})

	// Test 5: /v1/activate with binding of another INN -> 403
	t.Run("Activate with binding of another INN", func(t *testing.T) {
		// Attempt to activate INN B using Cert A (bound to INN A)
		req := map[string]string{
			"inn":              innB,
			"fingerprint":      "hardware-fp-2",
			"version":          "1.0",
			"cert_fingerprint": certAFingerprint,
		}

		code, body := makeRequest("POST", "/v1/activate", req, certA)
		// Should fail because binding.INN (A) != requested INN (B)
		// Also ActivateInstance checks if license exists and is active for INN B (it is),
		// but then checks if certFingerprint is bound to INN B.
		// Since certFingerprint is bound to INN A, it should fail.

		// In service.go:
		// binding, err := s.db.GetClientCertBinding(ctx, certFingerprint)
		// if binding.INN != inn { return error }

		// So it should be an error (likely mapped to 403 or 500).

		if code != http.StatusForbidden {
			t.Errorf("Expected 403, got %d. Body: %s", code, body)
		}
	})

	// Test 6: /v1/heartbeat with mTLS -> 200
	t.Run("Heartbeat with mTLS", func(t *testing.T) {
		code, _ := makeRequest("GET", "/v1/heartbeat", nil, certA)
		if code != http.StatusOK {
			t.Errorf("Expected 200, got %d", code)
		}
	})

	// Test 7: /v1/heartbeat without mTLS -> 403
	t.Run("Heartbeat without mTLS", func(t *testing.T) {
		code, _ := makeRequest("GET", "/v1/heartbeat", nil, nil)
		if code != http.StatusForbidden {
			t.Errorf("Expected 403, got %d", code)
		}
	})
}
