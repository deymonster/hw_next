package main

import (
	"crypto/tls"
	"crypto/x509"
	"log"
	"net/http"
	"os"

	"github.com/deymonster/li-server/internal/config"
	"github.com/deymonster/li-server/internal/router"
	"github.com/deymonster/li-server/internal/services"
)

func main() {
	cfg := config.Load()

	// 1. Настройка mTLS: Загружаем CA для проверки клиентов
	caCert, err := os.ReadFile(cfg.TLSCACertPath)
	if err != nil {
		log.Fatalf("Failed to read CA cert from %s: %v", cfg.TLSCACertPath, err)
	}
	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM(caCert) {
		log.Fatalf("Failed to append CA cert")
	}

	tlsConfig := &tls.Config{
		ClientCAs:  caCertPool,
		ClientAuth: tls.RequireAndVerifyClientCert, // Строгая проверка сертификата клиента!
		MinVersion: tls.VersionTLS13,
	}

	// 2. Инициализация сервисов
	tokenService, err := services.NewTokenService(cfg.LicensePrivateKeyPath)
	if err != nil {
		log.Fatalf("Failed to initialize token service: %v", err)
	}

	// 3. Инициализация роутера и сервера
	r := router.New(tokenService)

	srv := &http.Server{
		Addr:      ":" + cfg.Port,
		Handler:   r,
		TLSConfig: tlsConfig,
	}

	log.Printf("Starting License Server on port %s (mTLS enabled)...", cfg.Port)

	// 3. Запуск
	// Используем сертификат сервера и ключ для HTTPS
	if err := srv.ListenAndServeTLS(cfg.TLSCertPath, cfg.TLSKeyPath); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
