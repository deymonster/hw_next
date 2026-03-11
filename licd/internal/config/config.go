package config

import (
	"os"
	"strconv"
	"time"
)

// Config содержит конфигурацию приложения
type Config struct {
	Port             int    `json:"port"`
	MaxAgents        int    `json:"max_agents"`
	JobName          string `json:"job_name"`
	Environment      string `json:"environment"`
	StoragePath      string `json:"storage_path"`
	LicensePublicKey string `json:"license_public_key"`
	FingerprintSalt  string `json:"fingerprint_salt"`

	// mTLS Configuration
	LicenseServerURL string `json:"license_server_url"`
	TLSCertPath      string `json:"tls_cert_path"`
	TLSKeyPath       string `json:"tls_key_path"`
	TLSCACertPath    string `json:"tls_ca_cert_path"`

	HeartbeatInterval time.Duration `json:"heartbeat_interval"`
}

// Load загружает конфигурацию из переменных окружения
func Load() (*Config, error) {
	cfg := &Config{
		Port:             8081,
		MaxAgents:        50,
		JobName:          "windows-agents",
		Environment:      "development",
		FingerprintSalt:  "hw-monitor-default-salt",          // Default salt
		LicenseServerURL: "https://license.hw-monitor.local", // Default URL
	}

	if v := os.Getenv("SERVER_PORT"); v != "" {
		if n, _ := strconv.Atoi(v); n > 0 {
			cfg.Port = n
		}
	}
	if v := os.Getenv("PORT"); v != "" {
		if n, _ := strconv.Atoi(v); n > 0 {
			cfg.Port = n
		}
	}
	if v := os.Getenv("MAX_AGENTS"); v != "" {
		if n, _ := strconv.Atoi(v); n > 0 {
			cfg.MaxAgents = n
		}
	}
	if v := os.Getenv("JOB_NAME"); v != "" {
		cfg.JobName = v
	}
	if v := os.Getenv("ENVIRONMENT"); v != "" {
		cfg.Environment = v
	}
	if v := os.Getenv("STORAGE_FILE_PATH"); v != "" {
		cfg.StoragePath = v
	} else {
		cfg.StoragePath = "./data/licd.db"
	}

	if v := os.Getenv("LICENSE_PUBLIC_KEY"); v != "" {
		cfg.LicensePublicKey = v
	}

	if v := os.Getenv("FINGERPRINT_SALT"); v != "" {
		cfg.FingerprintSalt = v
	}

	if v := os.Getenv("LICENSE_SERVER_URL"); v != "" {
		cfg.LicenseServerURL = v
	}
	if v := os.Getenv("CERT_PATH"); v != "" {
		cfg.TLSCertPath = v
	}
	if v := os.Getenv("KEY_PATH"); v != "" {
		cfg.TLSKeyPath = v
	}
	if v := os.Getenv("CA_PATH"); v != "" {
		cfg.TLSCACertPath = v
	}
	// Legacy support (optional)
	if v := os.Getenv("TLS_CERT_PATH"); v != "" {
		cfg.TLSCertPath = v
	}
	if v := os.Getenv("TLS_KEY_PATH"); v != "" {
		cfg.TLSKeyPath = v
	}
	if v := os.Getenv("TLS_CA_CERT_PATH"); v != "" {
		cfg.TLSCACertPath = v
	}

	if v := os.Getenv("HEARTBEAT_INTERVAL"); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			cfg.HeartbeatInterval = d
		}
	}
	if cfg.HeartbeatInterval == 0 {
		cfg.HeartbeatInterval = 24 * time.Hour
	}

	return cfg, nil
}
