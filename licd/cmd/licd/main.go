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
	"github.com/deymonster/licd/internal/storage/sqlite"
	"github.com/joho/godotenv"
)

func main() {
	// 1) .env (не критично в проде, но удобно локально)
	_ = godotenv.Load(".env")

	// 2) Конфиг
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	log.Printf("Config loaded: port=%d max_agents=%d job=%s db=%s",
		cfg.Port, cfg.MaxAgents, cfg.JobName, cfg.StoragePath)

	// 3) БД + миграции
	db, err := sqlite.NewDatabase(cfg.StoragePath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// 4) Репозитории
	activationRepo := sqlite.NewActivationRepository(db.DB())

	// 5) UseCases (протягиваем лимит и jobName)
	deviceUseCase := usecases.NewDeviceUseCase(activationRepo, cfg.MaxAgents, cfg.JobName)

	// 6) Handlers
	deviceHandler := handlers.NewDeviceHandler(deviceUseCase)
	licenseHandler := handlers.NewLicenseHandler(deviceUseCase)
	prometheusHandler := handlers.NewPrometheusHandler(deviceUseCase)

	// 7) Router
	r := router.NewRouter()
	r.SetupDeviceRoutes(deviceHandler)
	r.SetupLicenseRoutes(licenseHandler)
	r.SetupPrometheusRoutes(prometheusHandler)

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
