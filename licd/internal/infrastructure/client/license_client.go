package client

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// LicenseClient handles communication with the central licensing server
type LicenseClient struct {
	client  *http.Client
	baseURL string
}

// LicenseResponse represents the response from the license server
type LicenseResponse struct {
	Token string `json:"token"`
}

// ActivateRequest represents the request body for license activation
type ActivateRequest struct {
	INN         string `json:"inn"`
	Fingerprint string `json:"fingerprint"`
	Version     string `json:"version"`
}

// RegisterRequest represents the request body for registration
type RegisterRequest struct {
	INN string `json:"inn"`
	CSR string `json:"csr"`
}

// RegisterResponse represents the response from the license server
type RegisterResponse struct {
	Certificate   string `json:"certificate"`
	CACertificate string `json:"ca_certificate"`
}

// NewLicenseClient creates a new LicenseClient
// If certPath/keyPath are missing, it starts in bootstrap mode (only CA trusted)
func NewLicenseClient(baseURL, certPath, keyPath, caPath string) (*LicenseClient, error) {
	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS13,
	}

	// 1. Load CA certificate (optional for bootstrap if system roots are used, but recommended)
	if caPath != "" {
		caCert, err := os.ReadFile(caPath)
		if err == nil {
			caCertPool := x509.NewCertPool()
			if caCertPool.AppendCertsFromPEM(caCert) {
				tlsConfig.RootCAs = caCertPool
			}
		} else if !os.IsNotExist(err) {
			return nil, fmt.Errorf("failed to read CA certificate: %w", err)
		}
	}

	// 2. Load client cert/key pair (if exist)
	cert, err := tls.LoadX509KeyPair(certPath, keyPath)
	if err == nil {
		tlsConfig.Certificates = []tls.Certificate{cert}
	}

	// 3. Create HTTP client with custom Transport
	transport := &http.Transport{
		TLSClientConfig:   tlsConfig,
		ForceAttemptHTTP2: true,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   30 * time.Second,
	}

	return &LicenseClient{
		client:  client,
		baseURL: baseURL,
	}, nil
}

// Reload reinitializes the client with new certificates
func (c *LicenseClient) Reload(certPath, keyPath, caPath string) error {
	newClient, err := NewLicenseClient(c.baseURL, certPath, keyPath, caPath)
	if err != nil {
		return err
	}
	c.client = newClient.client
	return nil
}

// Register sends a registration request with CSR
func (c *LicenseClient) Register(ctx context.Context, inn string, csrPEM []byte) (*RegisterResponse, error) {
	reqBody := RegisterRequest{
		INN: inn,
		CSR: string(csrPEM),
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/v1/register", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("server returned error %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result RegisterResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// Activate sends an activation request to the license server
func (c *LicenseClient) Activate(ctx context.Context, inn, fingerprint string) (*LicenseResponse, error) {
	reqBody := ActivateRequest{
		INN:         inn,
		Fingerprint: fingerprint,
		Version:     "1.0.0", // TODO: Inject version
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/v1/activate", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("server returned error %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result LicenseResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}
