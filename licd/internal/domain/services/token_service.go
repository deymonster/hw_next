package services

import (
	"crypto/ed25519"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"

	"github.com/deymonster/licd/internal/domain/entities"
	"github.com/golang-jwt/jwt/v5"
)

// TokenService handles license token operations
type TokenService struct {
	publicKey ed25519.PublicKey
}

// NewTokenService creates a new token service with the given public key
func NewTokenService(pemPublicKey string) (*TokenService, error) {
	if pemPublicKey == "" {
		return nil, errors.New("public key is empty")
	}

	block, _ := pem.Decode([]byte(pemPublicKey))
	if block == nil || block.Type != "PUBLIC KEY" {
		return nil, errors.New("failed to decode PEM block containing public key")
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse public key: %w", err)
	}

	edPub, ok := pub.(ed25519.PublicKey)
	if !ok {
		return nil, errors.New("public key is not of type Ed25519")
	}

	return &TokenService{
		publicKey: edPub,
	}, nil
}

// UpdatePublicKey updates the public key used for token verification
func (s *TokenService) UpdatePublicKey(pemPublicKey string) error {
	if pemPublicKey == "" {
		return errors.New("public key is empty")
	}

	block, _ := pem.Decode([]byte(pemPublicKey))
	if block == nil || block.Type != "PUBLIC KEY" {
		return errors.New("failed to decode PEM block containing public key")
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return fmt.Errorf("failed to parse public key: %w", err)
	}

	edPub, ok := pub.(ed25519.PublicKey)
	if !ok {
		return errors.New("public key is not of type Ed25519")
	}

	s.publicKey = edPub
	return nil
}

// VerifyToken verifies the JWT token and returns the claims
func (s *TokenService) VerifyToken(tokenString string) (*entities.LicenseClaims, error) {
	if s == nil {
		return nil, errors.New("token service not initialized (missing public key)")
	}

	token, err := jwt.ParseWithClaims(tokenString, &entities.LicenseClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodEd25519); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.publicKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("token validation failed: %w", err)
	}

	if claims, ok := token.Claims.(*entities.LicenseClaims); ok && token.Valid {
		// Additional checks
		if claims.Status != "active" {
			return nil, fmt.Errorf("license is not active: %s", claims.Status)
		}
		return claims, nil
	}

	return nil, errors.New("invalid token claims")
}
