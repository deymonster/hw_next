package license

import (
	"context"
	"crypto/sha256"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"time"

	"github.com/deymonster/lic-server/internal/storage/sqlite"
	"github.com/golang-jwt/jwt/v5"
)

// Repository defines the interface for license storage
type Repository interface {
	GetLicenseByINN(ctx context.Context, inn string) (*sqlite.License, error)
	SaveClientCertBinding(ctx context.Context, binding *sqlite.ClientCertBinding) error
	GetClientCertBinding(ctx context.Context, fingerprint string) (*sqlite.ClientCertBinding, error)
	ValidateAndConsumeEnrollmentToken(ctx context.Context, token, inn string) error
	CreateEnrollmentToken(ctx context.Context, inn string, ttl time.Duration) (string, error)
	LogAudit(ctx context.Context, action, inn, ip, details string) error
}

// CAService defines the interface for certificate operations
type CAService interface {
	SignCSR(csr *x509.CertificateRequest) ([]byte, error)
	GetCACertPEM() []byte
}

// TokenService defines the interface for token generation
type TokenService interface {
	SignToken(claims jwt.Claims) (string, error)
	GetPublicKeyPEM() ([]byte, error)
}

// Service implements the license business logic
type Service struct {
	db          Repository
	ca          CAService
	token       TokenService
	staticToken string
}

// NewService creates a new license service
func NewService(db Repository, ca CAService, token TokenService, staticToken string) *Service {
	return &Service{
		db:          db,
		ca:          ca,
		token:       token,
		staticToken: staticToken,
	}
}

// RegisterInstance handles the CSR flow: validates INN, signs CSR, returns Client Cert + CA Cert
func (s *Service) RegisterInstance(ctx context.Context, inn, token string, csrPEM []byte, ip string) ([]byte, []byte, []byte, error) {
	_ = s.db.LogAudit(ctx, "register_attempt", inn, ip, "started")

	// 1. Validate Enrollment Token
	// Check static token first if configured
	if s.staticToken != "" && token == s.staticToken {
		// Valid static token, skip DB validation/consumption
		_ = s.db.LogAudit(ctx, "register_token_valid", inn, ip, "static_token_used")
	} else {
		if err := s.db.ValidateAndConsumeEnrollmentToken(ctx, token, inn); err != nil {
			_ = s.db.LogAudit(ctx, "register_failed", inn, ip, fmt.Sprintf("token_error: %v", err))
			return nil, nil, nil, fmt.Errorf("enrollment token validation failed: %w", err)
		}
	}

	// 2. Verify INN exists
	lic, err := s.db.GetLicenseByINN(ctx, inn)
	if err != nil {
		_ = s.db.LogAudit(ctx, "register_failed", inn, ip, fmt.Sprintf("inn_lookup_error: %v", err))
		return nil, nil, nil, fmt.Errorf("license check failed: %w", err)
	}
	if lic == nil {
		_ = s.db.LogAudit(ctx, "register_failed", inn, ip, "license_not_found")
		return nil, nil, nil, fmt.Errorf("license not found for INN %s", inn)
	}

	// 3. Parse CSR
	block, _ := pem.Decode(csrPEM)
	if block == nil {
		_ = s.db.LogAudit(ctx, "register_failed", inn, ip, "invalid_pem")
		return nil, nil, nil, fmt.Errorf("failed to decode CSR PEM")
	}
	csr, err := x509.ParseCertificateRequest(block.Bytes)
	if err != nil {
		_ = s.db.LogAudit(ctx, "register_failed", inn, ip, fmt.Sprintf("csr_parse_error: %v", err))
		return nil, nil, nil, fmt.Errorf("failed to parse CSR: %w", err)
	}

	// 4. Verify CSR signature
	if sigErr := csr.CheckSignature(); sigErr != nil {
		_ = s.db.LogAudit(ctx, "register_failed", inn, ip, fmt.Sprintf("csr_sig_error: %v", sigErr))
		return nil, nil, nil, fmt.Errorf("invalid CSR signature: %w", sigErr)
	}

	// 5. Sign CSR
	certPEM, err := s.ca.SignCSR(csr)
	if err != nil {
		_ = s.db.LogAudit(ctx, "register_failed", inn, ip, fmt.Sprintf("sign_error: %v", err))
		return nil, nil, nil, fmt.Errorf("failed to sign CSR: %w", err)
	}

	// 6. Save Certificate Binding
	// Parse the signed certificate to get details for binding
	block, _ = pem.Decode(certPEM)
	if block == nil {
		_ = s.db.LogAudit(ctx, "register_failed", inn, ip, "cert_decode_error")
		return nil, nil, nil, fmt.Errorf("failed to decode signed certificate")
	}
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		_ = s.db.LogAudit(ctx, "register_failed", inn, ip, fmt.Sprintf("cert_parse_error: %v", err))
		return nil, nil, nil, fmt.Errorf("failed to parse signed certificate: %w", err)
	}

	fingerprint := fmt.Sprintf("%x", sha256.Sum256(cert.Raw))

	binding := &sqlite.ClientCertBinding{
		INN:                   inn,
		CertSerial:            cert.SerialNumber.String(),
		CertFingerprintSHA256: fingerprint,
		SubjectCN:             cert.Subject.CommonName,
		IssuedAt:              cert.NotBefore,
		ExpiresAt:             cert.NotAfter,
		Status:                "active",
	}

	if saveErr := s.db.SaveClientCertBinding(ctx, binding); saveErr != nil {
		_ = s.db.LogAudit(ctx, "register_failed", inn, ip, fmt.Sprintf("binding_save_error: %v", saveErr))
		return nil, nil, nil, fmt.Errorf("failed to save certificate binding: %w", saveErr)
	}

	// 7. Get Public Key
	pubKeyPEM, err := s.token.GetPublicKeyPEM()
	if err != nil {
		_ = s.db.LogAudit(ctx, "register_failed", inn, ip, fmt.Sprintf("pubkey_error: %v", err))
		return nil, nil, nil, fmt.Errorf("failed to get public key: %w", err)
	}

	_ = s.db.LogAudit(ctx, "register_success", inn, ip, fmt.Sprintf("serial=%s", cert.SerialNumber))
	return certPEM, s.ca.GetCACertPEM(), pubKeyPEM, nil
}

// ActivateInstance verifies the license and generates a JWT token for the agent
func (s *Service) ActivateInstance(ctx context.Context, inn, fingerprint, version, certFingerprint string, ip string) (token string, err error) {
	_ = s.db.LogAudit(ctx, "activate_attempt", inn, ip, fmt.Sprintf("fp=%s", fingerprint))
	defer func() {
		if err != nil {
			_ = s.db.LogAudit(ctx, "activate_failed", inn, ip, err.Error())
		} else {
			_ = s.db.LogAudit(ctx, "activate_success", inn, ip, "token_issued")
		}
	}()

	// 1. Verify INN and license status
	lic, err := s.db.GetLicenseByINN(ctx, inn)
	if err != nil {
		return "", fmt.Errorf("license check failed: %w", err)
	}
	if lic == nil || lic.Status != "active" {
		return "", fmt.Errorf("no active license found for INN %s", inn)
	}

	// 2. Verify Certificate Binding
	if certFingerprint != "" {
		binding, bindErr := s.db.GetClientCertBinding(ctx, certFingerprint)
		if bindErr != nil {
			return "", fmt.Errorf("failed to check certificate binding: %w", bindErr)
		}
		if binding == nil {
			return "", fmt.Errorf("client certificate not bound to any license")
		}
		if binding.INN != inn {
			return "", fmt.Errorf("client certificate bound to different INN")
		}
		if binding.Status != "active" {
			return "", fmt.Errorf("client certificate binding is not active")
		}
	}

	// 3. Generate Claims
	now := time.Now()
	claims := &LicenseClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        fmt.Sprintf("%d", now.UnixNano()), // Unique ID for the token
			Subject:   inn,
			Issuer:    "lic-server",
			Audience:  jwt.ClaimStrings{"licd-agent"},
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(lic.ExpiresAt), // Token valid until license expires
		},
		LicenseID:       fmt.Sprintf("%d", lic.ID),
		INN:             lic.INN,
		OrgName:         lic.Organization,
		MaxAgents:       lic.MaxSlots,
		FingerprintHash: fingerprint,
		ActivationDate:  now.Format(time.RFC3339),
		KeyVersion:      1,
		Status:          lic.Status,
	}

	// 4. Sign Token
	token, err = s.token.SignToken(claims)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return token, nil
}

// VerifyLicenseByCert checks if the client certificate is bound to a valid active license
func (s *Service) VerifyLicenseByCert(ctx context.Context, certFingerprint, ip string) error {
	// 1. Verify Certificate Binding
	binding, err := s.db.GetClientCertBinding(ctx, certFingerprint)
	if err != nil {
		_ = s.db.LogAudit(ctx, "heartbeat_failed", "unknown", ip, fmt.Sprintf("binding_lookup_error: %v", err))
		return fmt.Errorf("failed to check certificate binding: %w", err)
	}
	if binding == nil {
		_ = s.db.LogAudit(ctx, "heartbeat_failed", "unknown", ip, "no_binding")
		return fmt.Errorf("client certificate not bound to any license")
	}

	// 2. Verify License Status
	lic, err := s.db.GetLicenseByINN(ctx, binding.INN)
	if err != nil {
		_ = s.db.LogAudit(ctx, "heartbeat_failed", binding.INN, ip, fmt.Sprintf("license_lookup_error: %v", err))
		return fmt.Errorf("license check failed: %w", err)
	}
	if lic == nil {
		_ = s.db.LogAudit(ctx, "heartbeat_failed", binding.INN, ip, "license_not_found")
		return fmt.Errorf("license not found for INN %s", binding.INN)
	}
	if lic.Status != "active" {
		_ = s.db.LogAudit(ctx, "heartbeat_failed", binding.INN, ip, fmt.Sprintf("license_status: %s", lic.Status))
		return fmt.Errorf("license is not active")
	}

	// 3. Verify Binding Status
	if binding.Status != "active" {
		_ = s.db.LogAudit(ctx, "heartbeat_failed", binding.INN, ip, "binding_not_active")
		return fmt.Errorf("client certificate binding is not active")
	}

	// Log success only occasionally or debug? For audit, maybe "heartbeat" is too noisy?
	// Let's not log success for every heartbeat to avoid flooding DB.
	// Or maybe log only errors.
	return nil
}

// LogAudit logs an event to the audit log
func (s *Service) LogAudit(ctx context.Context, action, inn, ip, details string) error {
	return s.db.LogAudit(ctx, action, inn, ip, details)
}
