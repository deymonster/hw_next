package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/deymonster/licd/internal/api/handlers"
	"github.com/deymonster/licd/internal/api/router"
	"github.com/deymonster/licd/internal/application/usecases"
	"github.com/deymonster/licd/internal/config"
	"github.com/deymonster/licd/internal/domain/services"
	"github.com/deymonster/licd/internal/embedded"
	"github.com/deymonster/licd/internal/infrastructure/client"
	"github.com/deymonster/licd/internal/infrastructure/crypto"
	"github.com/deymonster/licd/internal/storage/sqlite"
	"github.com/joho/godotenv"
)

func main() {
	// 1) .env (не критично в проде, но удобно локально)
	if err := godotenv.Load(".env"); err != nil {
		log.Printf("No .env file found or error loading it: %v", err)
	} else {
		log.Println("Loaded .env file")
	}

	// 2) Конфиг
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	log.Printf("Config loaded: port=%d max_agents=%d job=%s db=%s server_url=%s skip_tls=%v cert_path=%s key_path=%s",
		cfg.Port, cfg.MaxAgents, cfg.JobName, cfg.StoragePath, cfg.LicenseServerURL, cfg.SkipTLSVerify, cfg.TLSCertPath, cfg.TLSKeyPath)

	// 3) БД + миграции
	db, err := sqlite.NewDatabase(cfg.StoragePath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// 4) Репозитории
	activationRepo := sqlite.NewActivationRepository(db.DB())

	// 5) Сервисы
	var tokenService *services.TokenService

	keyContent := cfg.LicensePublicKey
	if keyContent == "" && len(embedded.LicensePublicKey) > 0 {
		keyContent = string(embedded.LicensePublicKey)
		log.Println("Using embedded public key for license verification")
	}

	if keyContent != "" {
		// Если это путь к файлу, читаем его
		if _, err := os.Stat(keyContent); err == nil {
			content, err := os.ReadFile(keyContent)
			if err != nil {
				log.Printf("WARN: Failed to read public key file %s: %v", keyContent, err)
			} else {
				keyContent = string(content)
				log.Printf("Read public key from file: %s", cfg.LicensePublicKey)
			}
		} else {
			if cfg.LicensePublicKey != "" {
				log.Printf("Using public key from config string")
			}
		}

		var err error
		tokenService, err = services.NewTokenService(keyContent)
		if err != nil {
			log.Printf("WARN: Failed to initialize token service: %v. Token validation disabled.", err)
		} else {
			log.Println("Token service initialized successfully")
		}
	} else {
		log.Println("WARN: LICENSE_PUBLIC_KEY is empty and no embedded key found. Token validation disabled.")
	}

	// 5.5) Key Manager
	var keyManager *crypto.KeyManager
	if cfg.TLSCertPath != "" && cfg.TLSKeyPath != "" {
		keyManager = crypto.NewKeyManager(cfg.TLSCertPath, cfg.TLSKeyPath, cfg.LicensePublicKey)
	}

	// 5.6) License Client (mTLS or Bootstrap)
	var licenseClient *client.LicenseClient
	if cfg.LicenseServerURL != "" {
		// Initialize client even if certs missing (Bootstrap mode)
		// Assuming paths are provided in config for future saving
		var err error
		licenseClient, err = client.NewLicenseClient(cfg.LicenseServerURL, cfg.TLSCertPath, cfg.TLSKeyPath, cfg.SkipTLSVerify)
		if err != nil {
			log.Printf("WARN: Failed to initialize license client (URL: %s, SkipTLS: %v): %v. Automated activation disabled.",
				cfg.LicenseServerURL, cfg.SkipTLSVerify, err)
		} else {
			log.Printf("License client initialized (URL: %s, SkipTLS: %v)", cfg.LicenseServerURL, cfg.SkipTLSVerify)
		}
	} else {
		log.Println("License client not configured (missing URL). Automated activation disabled.")
	}

	// 6) UseCases (протягиваем лимит и jobName)
	deviceUseCase := usecases.NewDeviceUseCase(activationRepo, tokenService, licenseClient, keyManager, cfg.MaxAgents, cfg.JobName, cfg.FingerprintSalt, cfg.EnrollmentToken)

	// 7) Handlers
	deviceHandler := handlers.NewDeviceHandler(deviceUseCase)
	licenseHandler := handlers.NewLicenseHandler(deviceUseCase)
	prometheusHandler := handlers.NewPrometheusHandler(deviceUseCase)

	// 7) Router
	r := router.NewRouter()
	r.SetupDeviceRoutes(deviceHandler)
	r.SetupLicenseRoutes(licenseHandler)
	r.SetupPrometheusRoutes(prometheusHandler)

	// 7.2) Auto-Registration (Bootstrap / Certificate Recovery)
	certExists := false
	if cfg.TLSCertPath != "" {
		if _, err := os.Stat(cfg.TLSCertPath); err == nil {
			certExists = true
		}
	}

	if !certExists {
		// Сертификатов нет. Проверяем, есть ли у нас уже активная лицензия (и INN) в БД.
		// Если есть, мы должны автоматически восстановить сертификаты.
		// Если нет, мы просто ждем ручной активации через UI.
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		savedINN, _ := activationRepo.GetActiveLicenseKey(ctx)
		cancel()

		if savedINN != "" {
			log.Printf("INFO: Found existing license for INN %s but certificates are missing. Attempting certificate recovery...", savedINN)

			// Wait a bit for server to be fully ready if started together
			time.Sleep(2 * time.Second)

			ctxReg, cancelReg := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancelReg()

			if err := deviceUseCase.RegisterInstance(ctxReg, savedINN, cfg.EnrollmentToken); err != nil {
				log.Printf("ERROR: Certificate recovery failed: %v", err)
			} else {
				log.Printf("INFO: Certificate recovery successful. Certificates saved.")

				// Перезагружаем клиент с новыми сертификатами
				if keyManager != nil && licenseClient != nil {
					newClient, reloadErr := client.NewLicenseClient(cfg.LicenseServerURL, cfg.TLSCertPath, cfg.TLSKeyPath, cfg.SkipTLSVerify)
					if reloadErr != nil {
						log.Printf("WARN: Failed to reload certificates into client: %v", reloadErr)
					} else {
						*licenseClient = *newClient
						log.Printf("INFO: Certificates reloaded into license client successfully")
					}
				}
			}
		} else {
			log.Printf("INFO: Certificates are missing and no active license found in DB. Waiting for activation via UI.")
		}
	}

	// 7.5) Background Heartbeat (License Refresh)
	go func() {
		log.Printf("Starting background license heartbeat (every %v)...", cfg.HeartbeatInterval)
		// Initial check after start (with random jitter/delay to avoid thundering herd on restart)
		// If interval is small (testing), jitter should be small too
		startDelay := 30 * time.Second
		if cfg.HeartbeatInterval < 5*time.Minute {
			startDelay = 5 * time.Second
		}
		time.Sleep(startDelay + time.Duration(time.Now().Unix()%10)*time.Second)

		// First run
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Minute)
		if err := deviceUseCase.RefreshLicense(ctx); err != nil {
			// It's normal if no license is active yet
			log.Printf("INFO: Initial license refresh result: %v", err)
		} else {
			log.Println("Initial license refresh completed successfully")
		}
		cancel()

		ticker := time.NewTicker(cfg.HeartbeatInterval)
		defer ticker.Stop()

		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 1*time.Minute)
			if err := deviceUseCase.RefreshLicense(ctx); err != nil {
				log.Printf("ERROR: Scheduled license refresh failed: %v", err)
			} else {
				log.Println("Scheduled license refresh completed successfully")
			}
			cancel()
		}
	}()

	// 8) HTTP-сервер
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      r.Handler(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 9) Запуск
	go func() {
		log.Printf("Starting licd on :%d ...", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// 10) Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Shutdown error: %v", err)
	}
	log.Println("Server exited")
}
