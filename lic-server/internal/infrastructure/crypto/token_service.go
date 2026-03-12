package crypto

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

type TokenService struct {
	privateKey ed25519.PrivateKey
}

func (s *TokenService) GetPublicKeyPEM() ([]byte, error) {
	pub := s.privateKey.Public().(ed25519.PublicKey)
	pubBytes, err := x509.MarshalPKIXPublicKey(pub)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal public key: %w", err)
	}
	block := &pem.Block{Type: "PUBLIC KEY", Bytes: pubBytes}
	return pem.EncodeToMemory(block), nil
}

func NewTokenService(keyPath string) (*TokenService, error) {
	// Try to load key
	keyBytes, err := os.ReadFile(keyPath)
	if os.IsNotExist(err) {
		// Generate new key if not exists (for dev convenience)
		pub, priv, genErr := ed25519.GenerateKey(rand.Reader)
		if genErr != nil {
			return nil, fmt.Errorf("failed to generate key: %w", genErr)
		}

		// Save private key
		privBytes, marshalErr := x509.MarshalPKCS8PrivateKey(priv)
		if marshalErr != nil {
			return nil, fmt.Errorf("failed to marshal private key: %w", marshalErr)
		}
		pemBlock := &pem.Block{Type: "PRIVATE KEY", Bytes: privBytes}
		if writeErr := os.WriteFile(keyPath, pem.EncodeToMemory(pemBlock), 0600); writeErr != nil {
			return nil, fmt.Errorf("failed to save private key: %w", writeErr)
		}

		// Save public key (assumed to be keyPath + ".pub")
		pubBytes, pubMarshalErr := x509.MarshalPKIXPublicKey(pub)
		if pubMarshalErr != nil {
			return nil, fmt.Errorf("failed to marshal public key: %w", pubMarshalErr)
		}
		pubPemBlock := &pem.Block{Type: "PUBLIC KEY", Bytes: pubBytes}
		if writeErr := os.WriteFile(keyPath+".pub", pem.EncodeToMemory(pubPemBlock), 0644); writeErr != nil {
			return nil, fmt.Errorf("failed to save public key: %w", writeErr)
		}

		return &TokenService{privateKey: priv}, nil
	} else if err != nil {
		return nil, fmt.Errorf("failed to read key file: %w", err)
	}

	block, _ := pem.Decode(keyBytes)
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block")
	}

	priv, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	edPriv, ok := priv.(ed25519.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("key is not Ed25519")
	}

	return &TokenService{privateKey: edPriv}, nil
}

func (s *TokenService) SignToken(claims jwt.Claims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims)
	return token.SignedString(s.privateKey)
}
