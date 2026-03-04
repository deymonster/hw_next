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

// ActivateRequest represents the request body for activation
type ActivateRequest struct {
	INN         string `json:"inn"`
	Fingerprint string `json:"fingerprint"`
	Version     string `json:"version"`
}

// NewLicenseClient creates a new LicenseClient with mTLS configuration
func NewLicenseClient(baseURL, certPath, keyPath, caPath string) (*LicenseClient, error) {
	// 1. Load client cert/key pair
	cert, err := tls.LoadX509KeyPair(certPath, keyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load client certificate: %w", err)
	}

	// 2. Load CA certificate
	caCert, err := os.ReadFile(caPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read CA certificate: %w", err)
	}
	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM(caCert) {
		return nil, fmt.Errorf("failed to append CA certificate")
	}

	// 3. Setup TLS config
	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		RootCAs:      caCertPool,
		MinVersion:   tls.VersionTLS13,
		// In production, ServerName should be verified against the certificate
		// ServerName: "license.hw-monitor.local", 
	}

	// 4. Create HTTP client with custom Transport
	transport := &http.Transport{
		TLSClientConfig: tlsConfig,
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