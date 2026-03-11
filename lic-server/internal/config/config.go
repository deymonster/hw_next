package config

import (
	"os"
)

type Config struct {
	ServerAddress  string
	DBPath         string
	CAPath         string
	CAKeyPath      string
	ServerCertPath string
	ServerKeyPath  string
	LicenseKeyPath string
}

func Load() *Config {
	return &Config{
		ServerAddress:  getEnv("SERVER_ADDRESS", ":8080"),
		DBPath:         getEnv("DB_PATH", "data/lic-server.db"),
		CAPath:         getEnv("CA_PATH", "certs/ca.crt"),
		CAKeyPath:      getEnv("CA_KEY_PATH", "certs/ca.key"),
		ServerCertPath: getEnv("SERVER_CERT_PATH", "certs/server.crt"),
		ServerKeyPath:  getEnv("SERVER_KEY_PATH", "certs/server.key"),
		LicenseKeyPath: getEnv("LICENSE_KEY_PATH", "certs/license.key"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
