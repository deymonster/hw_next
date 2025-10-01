package config

import (
	"os"
	"strconv"
)

// Config содержит конфигурацию приложения
type Config struct {
	Port        int    `json:"port"`
	MaxAgents   int    `json:"max_agents"`
	JobName     string `json:"job_name"`
	Environment string `json:"environment"`
	StoragePath string `json:"storage_path"`
}

// Load загружает конфигурацию из переменных окружения
func Load() (*Config, error) {
	cfg := &Config{Port: 8081, MaxAgents: 50, JobName: "windows-agents", Environment: "development"}

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

	return cfg, nil
}
