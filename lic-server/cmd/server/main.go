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
	log.Printf("Initializing CA service... (CertPath: %s, KeyPath: %s)", cfg.CAPath, cfg.CAKeyPath)
	ca, err := crypto.NewCAService(cfg.CAPath, cfg.CAKeyPath)
	if err != nil {
		log.Fatalf("Failed to initialize CA service: %v", err)
	}
	log.Println("CA Service initialized successfully")

	// 2.1 Ensure Server Certs
	if _, statErr := os.Stat(cfg.ServerCertPath); os.IsNotExist(statErr) {
		log.Println("Generating server certificate...")
		// Пытаемся определить локальный IP для SAN
		localIPs := []net.IP{net.ParseIP("127.0.0.1")}
		addrs, _ := net.InterfaceAddrs()
		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
				if ipnet.IP.To4() != nil {
					localIPs = append(localIPs, ipnet.IP)
				}
			}
		}
		dns := []string{"localhost", "lic-server", "license.hw-monitor.local"}
		if genErr := ca.GenerateServerCert(cfg.ServerCertPath, cfg.ServerKeyPath, "lic-server", dns, localIPs); genErr != nil {
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
	svc := license.NewService(db, ca, tokenService, cfg.StaticEnrollmentToken)

	// 4.1 Seed Test Data (DEV ONLY)
	// TODO: Remove in production or move to admin API
	testINN := "1234567890"
	if seedErr := db.CreateLicense(context.Background(), testINN, "Test Org", 100); seedErr != nil {
		log.Printf("Failed to seed test license: %v", seedErr)
	} else {
		log.Printf("Seeded test license for INN: %s", testINN)
	}

	// 4.2 Generate Enrollment Token for Test INN (DEV ONLY)
	// This helps with local verification without manual DB insertion
	if cfg.StaticEnrollmentToken == "" {
		token, tokenErr := db.CreateEnrollmentToken(context.Background(), testINN, 24*time.Hour)
		if tokenErr != nil {
			log.Printf("Failed to create enrollment token: %v", tokenErr)
		} else {
			log.Printf("Generated Enrollment Token for INN %s: %s", testINN, token)
			log.Printf("Use this token to start licd: ENROLLMENT_TOKEN=%s go run ./cmd/licd", token)
		}
	} else {
		log.Printf("Using STATIC ENROLLMENT TOKEN from config: %s", cfg.StaticEnrollmentToken)
		log.Printf("Use this token to start licd: ENROLLMENT_TOKEN=%s go run ./cmd/licd", cfg.StaticEnrollmentToken)
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
