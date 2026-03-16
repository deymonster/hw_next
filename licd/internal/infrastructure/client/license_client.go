package client

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/deymonster/licd/internal/embedded"
)

// LicenseClient handles communication with the central licensing server
type LicenseClient struct {
	client     *http.Client
	baseURL    string
	skipVerify bool
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
	PublicKey     string `json:"public_key"`
}

// NewLicenseClient creates a new LicenseClient
// If certPath/keyPath are missing, it starts in bootstrap mode (only CA trusted)
func NewLicenseClient(baseURL, certPath, keyPath, caPath string, skipVerify bool) (*LicenseClient, error) {
	tlsConfig := &tls.Config{
		MinVersion:         tls.VersionTLS13,
		InsecureSkipVerify: skipVerify,
	}

	// 1. Load embedded CA certificate (Pinned CA)
	// We ignore caPath here and use the embedded CA for strict pinning
	caCertPool := x509.NewCertPool()
	if ok := caCertPool.AppendCertsFromPEM(embedded.CACert); !ok {
		return nil, fmt.Errorf("failed to append embedded CA certificate")
	}
	tlsConfig.RootCAs = caCertPool
	fmt.Printf("Using embedded CA certificate (%d bytes)\n", len(embedded.CACert))

	// 2. Load client cert/key pair (if exist)
	if certPath != "" && keyPath != "" {
		cert, err := tls.LoadX509KeyPair(certPath, keyPath)
		if err == nil {
			tlsConfig.Certificates = []tls.Certificate{cert}
		}
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
		client:     client,
		baseURL:    baseURL,
		skipVerify: skipVerify,
	}, nil
}

// Reload reinitializes the client with new certificates
func (c *LicenseClient) Reload(certPath, keyPath, caPath string) error {
	newClient, err := NewLicenseClient(c.baseURL, certPath, keyPath, caPath, c.skipVerify)
	if err != nil {
		return err
	}
	c.client = newClient.client
	return nil
}

// Register sends a registration request with CSR
func (c *LicenseClient) Register(ctx context.Context, inn string, csrPEM []byte) (*RegisterResponse, error) {
	log.Printf("DEBUG: Register called. INN: %s", inn)

	reqBody := RegisterRequest{
		INN: inn,
		CSR: string(csrPEM),
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/v1/register", c.baseURL)
	log.Printf("DEBUG: Registering with URL: %s", url)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	log.Printf("DEBUG: Sending HTTP request to %s...", url)
	resp, err := c.client.Do(req)
	if err != nil {
		log.Printf("ERROR: Failed to send request: %v", err)
		// Check for common network errors to provide user-friendly message
		return nil, fmt.Errorf("license server unavailable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		errorMsg := string(bodyBytes)

		// Try to parse JSON error
		var errResp map[string]string
		if json.Unmarshal(bodyBytes, &errResp) == nil && errResp["error"] != "" {
			errorMsg = errResp["error"]
		}

		log.Printf("ERROR: Server returned %d: %s", resp.StatusCode, errorMsg)

		if resp.StatusCode == http.StatusNotFound {
			return nil, fmt.Errorf("license not found for this INN")
		}
		if resp.StatusCode == http.StatusBadGateway || resp.StatusCode == http.StatusServiceUnavailable {
			return nil, fmt.Errorf("license server unavailable (502/503)")
		}

		return nil, fmt.Errorf("%s", errorMsg)
	}

	bodyBytes, _ := io.ReadAll(resp.Body)
	log.Printf("DEBUG: Register response body: %s", string(bodyBytes))

	var result RegisterResponse
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		log.Printf("ERROR: Failed to unmarshal response: %v", err)
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// Activate sends an activation request to the license server
func (c *LicenseClient) Activate(ctx context.Context, inn, fingerprint string) (*LicenseResponse, error) {
	log.Printf("DEBUG: Activate called. INN: %s, Fingerprint: %s", inn, fingerprint)

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
	log.Printf("DEBUG: Activating with URL: %s", url)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		log.Printf("ERROR: Failed to send activation request: %v", err)
		return nil, fmt.Errorf("license server unavailable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		errorMsg := string(bodyBytes)

		// Try to parse JSON error
		var errResp map[string]string
		if json.Unmarshal(bodyBytes, &errResp) == nil && errResp["error"] != "" {
			errorMsg = errResp["error"]
		}

		log.Printf("ERROR: Activation failed. Server returned %d: %s", resp.StatusCode, errorMsg)

		if resp.StatusCode == http.StatusNotFound {
			return nil, fmt.Errorf("license not found for this INN")
		}
		if resp.StatusCode == http.StatusBadGateway || resp.StatusCode == http.StatusServiceUnavailable {
			return nil, fmt.Errorf("license server unavailable (502/503)")
		}

		return nil, fmt.Errorf("%s", errorMsg)
	}

	var result LicenseResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}
