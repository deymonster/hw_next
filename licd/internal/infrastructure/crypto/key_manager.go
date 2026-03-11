package crypto

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"os"
)

// KeyManager handles cryptographic operations
type KeyManager struct {
	CertPath string
	KeyPath  string
	CAPath   string
}

// NewKeyManager creates a new KeyManager
func NewKeyManager(certPath, keyPath, caPath string) *KeyManager {
	return &KeyManager{
		CertPath: certPath,
		KeyPath:  keyPath,
		CAPath:   caPath,
	}
}

// GenerateKeyAndCSR generates a new private key and a CSR
func (km *KeyManager) GenerateKeyAndCSR(commonName string) ([]byte, []byte, error) {
	// 1. Generate ECDSA key
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate private key: %w", err)
	}

	// 2. Encode private key to PEM
	x509Encoded, err := x509.MarshalECPrivateKey(privateKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to marshal private key: %w", err)
	}
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: x509Encoded})

	// 3. Create CSR template
	template := x509.CertificateRequest{
		Subject: pkix.Name{
			CommonName: commonName,
		},
		SignatureAlgorithm: x509.ECDSAWithSHA256,
	}

	// 4. Create CSR
	csrBytes, err := x509.CreateCertificateRequest(rand.Reader, &template, privateKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create CSR: %w", err)
	}
	csrPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE REQUEST", Bytes: csrBytes})

	return keyPEM, csrPEM, nil
}

// SaveKey saves the private key to disk
func (km *KeyManager) SaveKey(keyPEM []byte) error {
	return os.WriteFile(km.KeyPath, keyPEM, 0600)
}

// SaveCert saves the certificate to disk
func (km *KeyManager) SaveCert(certPEM []byte) error {
	return os.WriteFile(km.CertPath, certPEM, 0644)
}

// SaveCA saves the CA certificate to disk (optional)
func (km *KeyManager) SaveCA(caPath string, caPEM []byte) error {
	return os.WriteFile(caPath, caPEM, 0644)
}

// HasCert checks if certificate and key exist
func (km *KeyManager) HasCert() bool {
	if _, err := os.Stat(km.CertPath); os.IsNotExist(err) {
		return false
	}
	if _, err := os.Stat(km.KeyPath); os.IsNotExist(err) {
		return false
	}
	return true
}
