package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"sync"
	"syscall"
	"time"
)

const (
	defaultSocketPath = "/var/run/hw-monitor/hw-agent.sock"
	defaultHwctlPath  = "/usr/local/bin/hwctl"
)

type Config struct {
	SocketPath string
	HwctlPath  string
	Debug      bool
}

type Agent struct {
	cfg    Config
	logger *slog.Logger
	mu     sync.Mutex // Ensures one update operation at a time
}

type Response struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

func main() {
	var cfg Config
	flag.StringVar(&cfg.SocketPath, "socket", defaultSocketPath, "Path to the unix socket")
	flag.StringVar(&cfg.HwctlPath, "hwctl", defaultHwctlPath, "Path to the hwctl script")
	flag.BoolVar(&cfg.Debug, "debug", false, "Enable debug logging")
	flag.Parse()

	logLevel := slog.LevelInfo
	if cfg.Debug {
		logLevel = slog.LevelDebug
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel}))

	if err := run(cfg, logger); err != nil {
		logger.Error("agent failed", "error", err)
		os.Exit(1)
	}
}

func run(cfg Config, logger *slog.Logger) error {
	// Ensure socket directory exists
	sockDir := filepath.Dir(cfg.SocketPath)
	if err := os.MkdirAll(sockDir, 0755); err != nil {
		return fmt.Errorf("failed to create socket directory: %w", err)
	}

	// Remove existing socket if present
	if _, err := os.Stat(cfg.SocketPath); err == nil {
		if err := os.Remove(cfg.SocketPath); err != nil {
			return fmt.Errorf("failed to remove existing socket: %w", err)
		}
	}

	listener, err := net.Listen("unix", cfg.SocketPath)
	if err != nil {
		return fmt.Errorf("failed to listen on socket: %w", err)
	}
	defer listener.Close()

	// Set socket permissions so the container can write to it (if mapped correctly)
	// In production, we might want to restrict this further (e.g., specific group)
	if err := os.Chmod(cfg.SocketPath, 0666); err != nil {
		return fmt.Errorf("failed to set socket permissions: %w", err)
	}

	agent := &Agent{
		cfg:    cfg,
		logger: logger,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", agent.handleHealth)
	mux.HandleFunc("/update", agent.handleUpdate)
	mux.HandleFunc("/restart", agent.handleRestart)

	server := &http.Server{
		Handler: mux,
	}

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		logger.Info("starting agent", "socket", cfg.SocketPath)
		if err := server.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server error", "error", err)
		}
	}()

	<-stop
	logger.Info("shutting down agent")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		return fmt.Errorf("server shutdown failed: %w", err)
	}

	return nil
}

func (a *Agent) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	respondJSON(w, Response{Success: true, Message: "ok"})
}

func (a *Agent) handleUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	a.logger.Info("update requested")

	// Execute hwctl update
	// We use a context with timeout to prevent hanging indefinitely
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute) // Updates can take time
	defer cancel()

	cmd := exec.CommandContext(ctx, a.cfg.HwctlPath, "update")
	output, err := cmd.CombinedOutput()

	if err != nil {
		a.logger.Error("update failed", "error", err, "output", string(output))
		respondJSON(w, Response{
			Success: false,
			Error:   fmt.Sprintf("Update failed: %v. Output: %s", err, string(output)),
		})
		return
	}

	a.logger.Info("update completed successfully")
	respondJSON(w, Response{
		Success: true,
		Message: "Update completed successfully",
	})
}

func (a *Agent) handleRestart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	a.logger.Info("restart requested")

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, a.cfg.HwctlPath, "restart")
	output, err := cmd.CombinedOutput()

	if err != nil {
		a.logger.Error("restart failed", "error", err, "output", string(output))
		respondJSON(w, Response{
			Success: false,
			Error:   fmt.Sprintf("Restart failed: %v. Output: %s", err, string(output)),
		})
		return
	}

	a.logger.Info("restart completed successfully")
	respondJSON(w, Response{
		Success: true,
		Message: "Restart completed successfully",
	})
}

func respondJSON(w http.ResponseWriter, resp Response) {
	w.Header().Set("Content-Type", "application/json")
	if !resp.Success {
		// You might want to use 500 or 400 depending on the error,
		// but for this simple agent, 200 with success: false is often easier to handle in clients
		// unless it's a protocol error. Let's stick to 200 OK for application-level errors
		// or 500 if it's a server failure.
		// For simplicity in the client, let's return 200 but with success=false body.
	}
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		// Only log, can't write to w anymore
		slog.Error("failed to encode response", "error", err)
	}
}
