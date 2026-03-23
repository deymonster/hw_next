package config

import (
	"os"
)

type Config struct {
	ServerAddress         string
	AdminAddress          string
	DBPath                string
	CAPath                string
	CAKeyPath             string
	ServerCertPath        string
	ServerKeyPath         string
	LicenseKeyPath        string
	StaticEnrollmentToken string
	AdminAPIKey           string
}

func Load() *Config {
	return &Config{
		ServerAddress:         getEnv("SERVER_ADDRESS", ":8443"),
		AdminAddress:          getEnv("ADMIN_ADDRESS", ":8080"),
		DBPath:                getEnv("DB_PATH", "data/lic-server.db"),
		CAPath:                getEnv("CA_PATH", "certs/ca.crt"),
		CAKeyPath:             getEnv("CA_KEY_PATH", "certs/ca.key"),
		ServerCertPath:        getEnv("SERVER_CERT_PATH", "certs/server.crt"),
		ServerKeyPath:         getEnv("SERVER_KEY_PATH", "certs/server.key"),
		LicenseKeyPath:        getEnv("LICENSE_KEY_PATH", "certs/license.key"),
		StaticEnrollmentToken: getEnv("STATIC_ENROLLMENT_TOKEN", ""),
		AdminAPIKey:           getEnv("ADMIN_API_KEY", "admin-secret-key-change-me"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
