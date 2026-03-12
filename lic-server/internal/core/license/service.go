package license

import (
	"context"
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
	db    Repository
	ca    CAService
	token TokenService
}

// NewService creates a new license service
func NewService(db Repository, ca CAService, token TokenService) *Service {
	return &Service{
		db:    db,
		ca:    ca,
		token: token,
	}
}

// RegisterInstance handles the CSR flow: validates INN, signs CSR, returns Client Cert + CA Cert
func (s *Service) RegisterInstance(ctx context.Context, inn string, csrPEM []byte) ([]byte, []byte, []byte, error) {
	// 1. Verify INN exists
	lic, err := s.db.GetLicenseByINN(ctx, inn)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("license check failed: %w", err)
	}
	if lic == nil {
		return nil, nil, nil, fmt.Errorf("license not found for INN %s", inn)
	}

	// 2. Parse CSR
	block, _ := pem.Decode(csrPEM)
	if block == nil {
		return nil, nil, nil, fmt.Errorf("failed to decode CSR PEM")
	}
	csr, err := x509.ParseCertificateRequest(block.Bytes)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to parse CSR: %w", err)
	}

	// 3. Verify CSR signature
	if sigErr := csr.CheckSignature(); sigErr != nil {
		return nil, nil, nil, fmt.Errorf("invalid CSR signature: %w", sigErr)
	}

	// 4. Sign CSR
	certPEM, err := s.ca.SignCSR(csr)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to sign CSR: %w", err)
	}

	// 5. Get Public Key
	pubKeyPEM, err := s.token.GetPublicKeyPEM()
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to get public key: %w", err)
	}

	return certPEM, s.ca.GetCACertPEM(), pubKeyPEM, nil
}

// ActivateInstance verifies the license and generates a JWT token for the agent
func (s *Service) ActivateInstance(ctx context.Context, inn, fingerprint, version string) (string, error) {
	// 1. Verify INN and license status
	lic, err := s.db.GetLicenseByINN(ctx, inn)
	if err != nil {
		return "", fmt.Errorf("license check failed: %w", err)
	}
	if lic == nil || lic.Status != "active" {
		return "", fmt.Errorf("no active license found for INN %s", inn)
	}

	// 2. Generate Claims
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

	// 3. Sign Token
	token, err := s.token.SignToken(claims)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return token, nil
}
