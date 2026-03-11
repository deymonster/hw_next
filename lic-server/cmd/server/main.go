package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/deymonster/lic-server/internal/api/router"
	"github.com/deymonster/lic-server/internal/config"
	"github.com/deymonster/lic-server/internal/core/license"
	"github.com/deymonster/lic-server/internal/infrastructure/crypto"
	"github.com/deymonster/lic-server/internal/storage/sqlite"
)

func main() {
	// 1. Load Config
	cfg := config.Load()
	log.Printf("Starting lic-server on %s (TLS enabled)", cfg.ServerAddress)

	// 2. Initialize Crypto (CA)
	ca, err := crypto.NewCAService(cfg.CAPath, cfg.CAKeyPath)
	if err != nil {
		log.Fatalf("Failed to initialize CA service: %v", err)
	}

	// 2.1 Ensure Server Certs
	if _, statErr := os.Stat(cfg.ServerCertPath); os.IsNotExist(statErr) {
		log.Println("Generating server certificate...")
		ips := []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("192.168.13.162")}
		dns := []string{"localhost", "lic-server", "license.hw-monitor.local"}
		if genErr := ca.GenerateServerCert(cfg.ServerCertPath, cfg.ServerKeyPath, "lic-server", dns, ips); genErr != nil {
			log.Fatalf("Failed to generate server cert: %v", genErr)
		}
	}

	// 2.2 Initialize Token Service
	tokenService, err := crypto.NewTokenService(cfg.LicenseKeyPath)
	if err != nil {
		log.Fatalf("Failed to initialize Token service: %v", err)
	}

	// 3. Initialize Storage
	db, err := sqlite.NewStorage(cfg.DBPath)
	if err != nil {
		log.Fatalf("Failed to initialize storage: %v", err)
	}
	defer db.Close()

	// 4. Initialize Core Service
	svc := license.NewService(db, ca, tokenService)

	// 4.1 Seed Test Data (DEV ONLY)
	// TODO: Remove in production or move to admin API
	if seedErr := db.CreateLicense(context.Background(), "1234567890", "Test Org", 100); seedErr != nil {
		log.Printf("Failed to seed test license: %v", seedErr)
	} else {
		log.Println("Seeded test license for INN: 1234567890")
	}

	// 5. Initialize Router
	r := router.NewRouter(svc)

	// 6. Configure TLS
	caCertPEM, err := os.ReadFile(cfg.CAPath)
	if err != nil {
		log.Fatalf("Failed to read CA cert: %v", err)
	}
	caCertPool := x509.NewCertPool()
	caCertPool.AppendCertsFromPEM(caCertPEM)

	tlsConfig := &tls.Config{
		ClientCAs:  caCertPool,
		ClientAuth: tls.VerifyClientCertIfGiven, // Allow missing for /register
		MinVersion: tls.VersionTLS13,
	}

	// 7. Start Server
	srv := &http.Server{
		Addr:      cfg.ServerAddress,
		Handler:   r,
		TLSConfig: tlsConfig,
	}

	go func() {
		// Use ListenAndServeTLS
		if srvErr := srv.ListenAndServeTLS(cfg.ServerCertPath, cfg.ServerKeyPath); srvErr != nil && srvErr != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", srvErr)
		}
	}()

	// 8. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if shutdownErr := srv.Shutdown(ctx); shutdownErr != nil {
		log.Fatalf("Server forced to shutdown: %v", shutdownErr)
	}

	log.Println("Server exited properly")
}
