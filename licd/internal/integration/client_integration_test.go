package integration_test

import (
	"context"
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"database/sql"
	"encoding/json"
	"encoding/pem"
	"math/big"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/deymonster/licd/internal/application/usecases"
	"github.com/deymonster/licd/internal/domain/services"
	"github.com/deymonster/licd/internal/infrastructure/client"
	"github.com/deymonster/licd/internal/infrastructure/crypto"
	"github.com/deymonster/licd/internal/storage/sqlite"
	"github.com/golang-jwt/jwt/v5"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/mattn/go-sqlite3"
)

// Mock Server State
type mockServer struct {
	caCert     *x509.Certificate
	caKey      *ecdsa.PrivateKey
	serverCert tls.Certificate
	tokenKey   ed25519.PrivateKey
	revoked    bool
}

func newMockServer() *mockServer {
	// 1. Generate CA
	caKey, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	caTemplate := x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: "Mock CA"},
		NotBefore:             time.Now(),
		NotAfter:              time.Now().Add(1 * time.Hour),
		IsCA:                  true,
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageCRLSign,
		BasicConstraintsValid: true,
	}
	caBytes, _ := x509.CreateCertificate(rand.Reader, &caTemplate, &caTemplate, &caKey.PublicKey, caKey)
	caCert, _ := x509.ParseCertificate(caBytes)

	// 2. Generate Server Cert
	serverKey, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	serverTemplate := x509.Certificate{
		SerialNumber: big.NewInt(2),
		Subject:      pkix.Name{CommonName: "localhost"},
		IPAddresses:  []net.IP{net.ParseIP("127.0.0.1")},
		NotBefore:    time.Now(),
		NotAfter:     time.Now().Add(1 * time.Hour),
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	}
	serverBytes, _ := x509.CreateCertificate(rand.Reader, &serverTemplate, caCert, &serverKey.PublicKey, caKey)
	serverCertBlock := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: serverBytes})
	serverKeyBlock := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: func() []byte { b, _ := x509.MarshalECPrivateKey(serverKey); return b }()})
	serverTLSCert, _ := tls.X509KeyPair(serverCertBlock, serverKeyBlock)

	// 3. Generate Token Key
	_, tokenKey, _ := ed25519.GenerateKey(rand.Reader)

	return &mockServer{
		caCert:     caCert,
		caKey:      caKey,
		serverCert: serverTLSCert,
		tokenKey:   tokenKey,
	}
}

func (s *mockServer) handler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/v1/register" {
		// Register Logic
		var req struct {
			INN string `json:"inn"`
			CSR string `json:"csr"`
		}
		json.NewDecoder(r.Body).Decode(&req)

		// Parse CSR
		block, _ := pem.Decode([]byte(req.CSR))
		csr, _ := x509.ParseCertificateRequest(block.Bytes)

		// Sign Client Cert
		clientTemplate := x509.Certificate{
			SerialNumber: big.NewInt(3),
			Subject:      csr.Subject,
			NotBefore:    time.Now(),
			NotAfter:     time.Now().Add(1 * time.Hour),
			ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		}
		clientBytes, _ := x509.CreateCertificate(rand.Reader, &clientTemplate, s.caCert, csr.PublicKey, s.caKey)
		clientPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: clientBytes})

		// Token Public Key
		pubKeyBytes, _ := x509.MarshalPKIXPublicKey(s.tokenKey.Public())
		pubKeyPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pubKeyBytes})

		resp := map[string]string{
			"certificate":    string(clientPEM),
			"ca_certificate": string(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: s.caCert.Raw})),
			"public_key":     string(pubKeyPEM),
		}
		json.NewEncoder(w).Encode(resp)
		return
	}

	if r.URL.Path == "/v1/activate" {
		// Verify mTLS
		if len(r.TLS.PeerCertificates) == 0 {
			http.Error(w, `{"error": "client certificate required"}`, http.StatusForbidden)
			return
		}

		if s.revoked {
			http.Error(w, `{"error": "client certificate bound to different INN"}`, http.StatusForbidden)
			return
		}

		// Generate JWT
		var req struct {
			INN         string `json:"inn"`
			Fingerprint string `json:"fingerprint"`
		}
		json.NewDecoder(r.Body).Decode(&req)

		token := jwt.NewWithClaims(jwt.SigningMethodEdDSA, jwt.MapClaims{
			"inn": req.INN,
			"fph": req.Fingerprint,
			"sts": "active",
			"max": 10,
			"lid": "test-license-id",
			"org": "Test Org",
			"act": time.Now().Format(time.RFC3339),
			"ver": 1,
			"exp": time.Now().Add(1 * time.Hour).Unix(),
		})
		tokenString, _ := token.SignedString(s.tokenKey)

		resp := map[string]string{
			"token": tokenString,
		}
		json.NewEncoder(w).Encode(resp)
		return
	}
	http.NotFound(w, r)
}

func TestLicdClientIntegration(t *testing.T) {
	// 1. Setup Mock Server
	ms := newMockServer()
	ts := httptest.NewUnstartedServer(http.HandlerFunc(ms.handler))

	certPool := x509.NewCertPool()
	certPool.AddCert(ms.caCert)

	ts.TLS = &tls.Config{
		Certificates: []tls.Certificate{ms.serverCert},
		ClientAuth:   tls.VerifyClientCertIfGiven,
		ClientCAs:    certPool,
	}
	ts.StartTLS()
	defer ts.Close()

	// 2. Setup Licd Environment
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "licd.db")
	certPath := filepath.Join(tempDir, "client.crt")
	keyPath := filepath.Join(tempDir, "client.key")
	licenseKeyPath := filepath.Join(tempDir, "license.pub")

	// Initialize DB manually
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		t.Fatalf("Failed to open DB: %v", err)
	}
	defer db.Close()

	// Run migrations
	wd, _ := os.Getwd()
	migrationsPath := filepath.Join(wd, "../../migrations")
	if _, statErr := os.Stat(migrationsPath); os.IsNotExist(statErr) {
		t.Fatalf("Migrations path not found: %s", migrationsPath)
	}

	driver, _ := sqlite3.WithInstance(db, &sqlite3.Config{})
	m, migErr := migrate.NewWithDatabaseInstance("file://"+migrationsPath, "sqlite3", driver)
	if migErr != nil {
		t.Fatalf("Failed to create migrate instance: %v", migErr)
	}
	if upErr := m.Up(); upErr != nil && upErr != migrate.ErrNoChange {
		t.Fatalf("Failed to migrate: %v", upErr)
	}

	repo := sqlite.NewActivationRepository(db)

	// Key Manager (with licenseKeyPath set so it saves public key)
	km := crypto.NewKeyManager(certPath, keyPath, licenseKeyPath)

	// Client (start insecure/bootstrap)
	licClient, err := client.NewLicenseClient(ts.URL, certPath, keyPath, true)
	if err != nil {
		t.Fatalf("Failed to create client: %v", err)
	}

	// Device UseCase
	uc := usecases.NewDeviceUseCase(repo, nil, licClient, km, 10, "test-job", "salt", "test-token")

	ctx := context.Background()
	inn := "1234567890"

	// Test 1: Fresh Start -> Register
	t.Run("Fresh Start Register", func(t *testing.T) {
		err := uc.RegisterInstance(ctx, inn, "test-token")
		if err != nil {
			t.Fatalf("Register failed: %v", err)
		}

		// Verify files
		if _, err := os.Stat(certPath); os.IsNotExist(err) {
			t.Error("Client cert not saved")
		}
		if _, err := os.Stat(keyPath); os.IsNotExist(err) {
			t.Error("Client key not saved")
		}
		if _, err := os.Stat(licenseKeyPath); os.IsNotExist(err) {
			t.Error("License public key not saved")
		}
	})

	// Test 2: Request License (Activate)
	t.Run("Request License", func(t *testing.T) {
		err := uc.RequestLicense(ctx, inn)
		if err != nil {
			t.Fatalf("RequestLicense failed: %v", err)
		}

		// Verify DB
		status, err := uc.GetLicenseStatus(ctx)
		if err != nil {
			t.Fatalf("GetLicenseStatus failed: %v", err)
		}
		if status.Status != "active" {
			t.Errorf("Expected status active, got %s", status.Status)
		}
	})

	// Test 3: Restart Licd (Reload)
	t.Run("Restart Licd", func(t *testing.T) {
		// Re-init UseCase to simulate restart
		// We use same repo (DB) and key paths

		// NOTE: DeviceUseCase usually relies on `main.go` to initialize TokenService from file if it exists.
		// `NewDeviceUseCase` takes `tokenService` as argument.
		// If we pass nil, `uc.RequestLicense` might fail if it relies on `tokenService` to verify cached token.
		// BUT `uc.RequestLicense` logic:
		// 1. GetActiveToken from DB
		// 2. VerifyToken (needs tokenService)
		// If tokenService is nil, it skips verification? No.
		// It checks `if uc.tokenService != nil`.
		// If nil, it proceeds to register?
		// `uc.RequestLicense` calls `RegisterInstance` if token check fails or if not activated.

		// To properly simulate restart, we must initialize `tokenService` manually from the saved public key.
		// But `services.NewTokenService` takes a PEM string.

		// We need to import services package but it was unused before.
		// I'll skip importing it and let `RegisterInstance` re-init it internally if needed.
		// Wait, `RegisterInstance` initializes `tokenService` IF it gets a public key from server.
		// If we call `RegisterInstance` again, it will get the key again.
		// But `RequestLicense` tries to use existing token first.

		// If `tokenService` is nil, `RequestLicense` will skip token verification (step 1)
		// and proceed to `RegisterInstance` (step 2).
		// `RegisterInstance` will re-register.
		// This is valid behavior (if no token service, assume needs refresh).

		// However, we want to test "Activate/Refresh works".
		// If it re-registers, it works.

		// Let's create a new client that uses the saved certs
		client2, err := client.NewLicenseClient(ts.URL, certPath, keyPath, true)
		if err != nil {
			t.Fatalf("Failed to create client 2: %v", err)
		}

		// Initialize TokenService manually (from saved key)
		pubKeyBytes, err := os.ReadFile(licenseKeyPath)
		if err != nil {
			t.Fatalf("failed to read license key: %v", err)
		}

		tokenSvc, err := services.NewTokenService(string(pubKeyBytes))
		if err != nil {
			t.Fatalf("failed to create token service: %v", err)
		}

		uc2 := usecases.NewDeviceUseCase(repo, tokenSvc, client2, km, 10, "test-job", "salt", "test-token")

		err = uc2.RefreshLicense(ctx)
		if err != nil {
			t.Fatalf("RefreshLicense failed: %v", err)
		}

		// Verify status is still active
		status, err := uc2.GetLicenseStatus(ctx)
		if err != nil {
			t.Fatalf("GetLicenseStatus failed: %v", err)
		}
		if status.Status != "active" {
			t.Errorf("Expected status active, got %s", status.Status)
		}
	})

	// Test 4: Revoked Binding
	t.Run("Revoked Binding", func(t *testing.T) {
		ms.revoked = true

		// Create client 3
		client3, _ := client.NewLicenseClient(ts.URL, certPath, keyPath, true)
		uc3 := usecases.NewDeviceUseCase(repo, nil, client3, km, 10, "test-job", "salt", "test-token")

		err := uc3.RefreshLicense(ctx)
		if err == nil {
			t.Error("Expected RefreshLicense to fail due to revocation, but it succeeded")
		} else {
			// Optional: check error message
			// "activation failed: ... client certificate bound to different INN"
			t.Logf("Got expected error: %v", err)
		}
	})
}
