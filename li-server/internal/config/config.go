package config

import (
	"os"
)

type Config struct {
	Port                  string
	TLSCertPath           string
	TLSKeyPath            string
	TLSCACertPath         string
	LicensePrivateKeyPath string
}

func Load() *Config {
	return &Config{
		Port:                  getEnv("PORT", "8443"),
		TLSCertPath:           getEnv("TLS_CERT_PATH", "../certs/server.crt"),
		TLSKeyPath:            getEnv("TLS_KEY_PATH", "../certs/server.key"),
		TLSCACertPath:         getEnv("TLS_CA_CERT_PATH", "../certs/ca.crt"),
		LicensePrivateKeyPath: getEnv("LICENSE_PRIVATE_KEY_PATH", "../certs/license_ed25519.key"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
