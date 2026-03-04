package services

import (
	"crypto/ed25519"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenService struct {
	privateKey ed25519.PrivateKey
}

func NewTokenService(keyPath string) (*TokenService, error) {
	keyBytes, err := os.ReadFile(keyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read private key: %w", err)
	}

	// Парсим как Ed25519 ключ (PKCS#8 или просто PEM блок)
	privateKey, err := jwt.ParseEdPrivateKeyFromPEM(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	// Приводим к конкретному типу
	edKey, ok := privateKey.(ed25519.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("key is not an Ed25519 private key")
	}

	return &TokenService{privateKey: edKey}, nil
}

func (s *TokenService) GenerateToken(inn, fingerprint string) (string, error) {
	// Срок действия - например, 1 год
	expirationTime := time.Now().Add(365 * 24 * time.Hour)
	now := time.Now()

	claims := jwt.MapClaims{
		"inn": inn,
		"fph": fingerprint, // fingerprint_hash -> fph
		"max": 50,          // max_agents -> max
		"sts": "active",    // status -> sts
		"act": now.Format(time.RFC3339),
		"lid": fmt.Sprintf("lic-%d", now.UnixNano()), // Генерируем ID
		"ver": 1,
		"exp": expirationTime.Unix(),
		"iat": now.Unix(),
	}

	// Используем SigningMethodEdDSA
	token := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims)
	return token.SignedString(s.privateKey)
}
