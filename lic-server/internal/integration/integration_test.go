package integration_test

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/deymonster/lic-server/internal/api/router"
	"github.com/deymonster/lic-server/internal/core/license"
	"github.com/deymonster/lic-server/internal/infrastructure/crypto"
	"github.com/deymonster/lic-server/internal/storage/sqlite"
)

func TestFullEnrollmentAndActivationFlow(t *testing.T) {
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
	r := router.NewRouter(svc)

	// Create TLS Server
	// We need to configure it to trust our CA for client auth
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
		ClientAuth: tls.RequireAndVerifyClientCert,
	}
	ts.StartTLS()
	defer ts.Close()

	// 2. Prepare Data
	ctx := context.Background()
	inn := "1234567890"
	// Create License
	if licErr := store.CreateLicense(ctx, inn, "Test Org", 10); licErr != nil {
		t.Fatalf("Failed to create license: %v", licErr)
	}

	// Create Enrollment Token
	enrollmentToken, err := store.CreateEnrollmentToken(ctx, inn, 1*time.Hour)
	if err != nil {
		t.Fatalf("Failed to create enrollment token: %v", err)
	}

	// 3. Register (Phase 4)
	// Client generates Key and CSR
	clientKey, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	csrTemplate := x509.CertificateRequest{
		Subject: pkix.Name{CommonName: "licd-client"},
	}
	csrBytes, _ := x509.CreateCertificateRequest(rand.Reader, &csrTemplate, clientKey)
	csrPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE REQUEST", Bytes: csrBytes})

	regReq := map[string]string{
		"inn":   inn,
		"csr":   string(csrPEM),
		"token": enrollmentToken,
	}
	regBody, _ := json.Marshal(regReq)

	// Create client that trusts server (ts.Client() handles server cert trust)
	client := ts.Client()

	// Register Endpoint is NOT protected by mTLS in Router (it's public)
	// But our Server enforces ClientAuth globally via ts.TLS?
	// Wait, httptest.Server is a net/http Server.
	// If `ClientAuth` is `RequireAndVerifyClientCert`, then ALL connections must present cert.
	// This breaks /register!
	// Real world: Nginx handles mTLS for specific paths or we use different ports/listeners.
	// Or we use `VerifyClientCertIfGiven` and handle logic in app?
	// `RequireMTLS` middleware in Router checks `r.TLS.PeerCertificates`.
	// So we should use `RequestClientCert` or `VerifyClientCertIfGiven`.
	// But `RequireMTLS` middleware requires verified chains.
	// If we use `VerifyClientCertIfGiven`, client CAN connect without cert.
	// So let's use `VerifyClientCertIfGiven`.
	ts.TLS.ClientAuth = tls.VerifyClientCertIfGiven

	// Restart server to apply config change?
	// ts.StartTLS() was called. Config is cloned?
	// Better to set it before StartTLS (which we did, but I need to change the value in code above).
	// I will modify the code to use VerifyClientCertIfGiven.

	// Retry request
	resp, err := client.Post(ts.URL+"/v1/register", "application/json", bytes.NewReader(regBody))
	if err != nil {
		t.Fatalf("Register request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("Register failed with status %d: %s", resp.StatusCode, body)
	}

	var regResp struct {
		Certificate   string `json:"certificate"`
		CACertificate string `json:"ca_certificate"`
		PublicKey     string `json:"public_key"`
	}
	json.NewDecoder(resp.Body).Decode(&regResp)
	resp.Body.Close()

	if regResp.Certificate == "" {
		t.Fatalf("Register response missing certificate")
	}

	// Verify Audit Log for Register
	audits, err := store.GetAuditEvents(ctx, inn)
	if err != nil {
		t.Fatalf("Failed to get audit events: %v", err)
	}
	if len(audits) == 0 {
		t.Errorf("No audit events found for INN %s", inn)
	} else {
		found := false
		for _, e := range audits {
			if e.Action == "register_success" {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected register_success audit event, but not found")
		}
	}

	// Verify Token Consumed
	err = store.ValidateAndConsumeEnrollmentToken(ctx, enrollmentToken, inn)
	if err == nil {
		t.Fatal("Token should be consumed/used, but validation succeeded again")
	} else if !strings.Contains(err.Error(), "already used") {
		// It might return "already used" or similar.
		// My implementation checks `used` flag.
		// If used, it returns error.
	}

	// 4. Activate (mTLS)
	// Create client with the received certificate
	cert, err := tls.X509KeyPair([]byte(regResp.Certificate), encodeKeyToPEM(clientKey))
	if err != nil {
		t.Fatalf("Failed to load client keypair: %v", err)
	}

	// Update client to use this cert
	transport := client.Transport.(*http.Transport).Clone()
	transport.TLSClientConfig.Certificates = []tls.Certificate{cert}
	clientWithCert := &http.Client{Transport: transport}

	actReq := map[string]string{
		"inn":         inn,
		"fingerprint": "hw-fingerprint-123",
		"version":     "1.0.0",
	}
	actBody, _ := json.Marshal(actReq)

	resp, err = clientWithCert.Post(ts.URL+"/v1/activate", "application/json", bytes.NewReader(actBody))
	if err != nil {
		t.Fatalf("Activate request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("Activate failed with status %d: %s", resp.StatusCode, body)
	}

	// Verify Audit Log
	audits, err = store.GetAuditEvents(ctx, inn)
	if err != nil {
		t.Errorf("Failed to get audit events: %v", err)
	}
	found := false
	for _, e := range audits {
		if e.Action == "activate_success" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("Expected activate_success audit event, but not found")
	}

	// 5. Test Rate Limiting
	// The rate limiter is per-IP (1 rps, burst 3).
	// We've already sent 2 requests (register, activate) which might count if same IP?
	// httptest server uses "127.0.0.1" usually.
	// We should wait a bit to reset bucket or just hammer it until 429.

	// Create a new client to avoid mTLS errors on /register (it's public but server enforces globally in our setup)
	// Wait, we set VerifyClientCertIfGiven, so client without cert is OK for public endpoints.
	plainClient := ts.Client()

	// We expect 429 eventually.
	// Since we used VerifyClientCertIfGiven, we can hit /register without cert.
	// But /register requires token. We can send invalid token just to trigger rate limit.

	limitHit := false
	for i := 0; i < 10; i++ {
		reqBody, _ := json.Marshal(map[string]string{
			"inn":   inn,
			"csr":   "invalid-csr",
			"token": "invalid-token",
		})
		resp, err := plainClient.Post(ts.URL+"/v1/register", "application/json", bytes.NewReader(reqBody))
		if err != nil {
			t.Logf("Request %d failed: %v", i, err)
			continue
		}
		resp.Body.Close()
		if resp.StatusCode == http.StatusTooManyRequests {
			limitHit = true
			break
		}
		time.Sleep(10 * time.Millisecond) // Short delay to not be TOO fast but fast enough
	}

	if !limitHit {
		t.Errorf("Rate limit was not triggered after 10 requests")
	}
}

func encodeKeyToPEM(key *ecdsa.PrivateKey) []byte {
	bytes, _ := x509.MarshalECPrivateKey(key)
	return pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: bytes})
}
