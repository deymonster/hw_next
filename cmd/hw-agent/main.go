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

	// Wrap mux with logging middleware
	loggedMux := agent.loggingMiddleware(mux)

	server := &http.Server{
		Handler: loggedMux,
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

	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Send initial message
	fmt.Fprintf(w, "data: %s\n\n", "Update started...")
	flusher.Flush()

	// Execute hwctl update
	// We use a context with timeout to prevent hanging indefinitely
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute) // Updates can take time
	defer cancel()

	cmd := exec.CommandContext(ctx, a.cfg.HwctlPath, "update")

	// Create pipes for stdout and stderr
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		fmt.Fprintf(w, "data: Error creating stdout pipe: %v\n\n", err)
		flusher.Flush()
		return
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		fmt.Fprintf(w, "data: Error creating stderr pipe: %v\n\n", err)
		flusher.Flush()
		return
	}

	if err := cmd.Start(); err != nil {
		fmt.Fprintf(w, "data: Error starting command: %v\n\n", err)
		flusher.Flush()
		return
	}

	// Stream output
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				chunk := string(buf[:n])
				// Clean up newlines for SSE format
				// In a real implementation, we might want to buffer lines
				fmt.Fprintf(w, "data: %s\n\n", chunk)
				if f, ok := w.(http.Flusher); ok {
					f.Flush()
				}
			}
			if err != nil {
				break
			}
		}
	}()

	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := stderr.Read(buf)
			if n > 0 {
				chunk := string(buf[:n])
				fmt.Fprintf(w, "data: %s\n\n", chunk)
				if f, ok := w.(http.Flusher); ok {
					f.Flush()
				}
			}
			if err != nil {
				break
			}
		}
	}()

	// Wait for command to finish
	err = cmd.Wait()

	if err != nil {
		a.logger.Error("update failed", "error", err)
		fmt.Fprintf(w, "data: Update failed: %v\n\n", err)
	} else {
		a.logger.Info("update completed successfully")
		fmt.Fprintf(w, "data: Update completed successfully\n\n")
	}

	// Send a special event to close the connection
	fmt.Fprintf(w, "event: close\ndata: closed\n\n")
	flusher.Flush()
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

func (a *Agent) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap ResponseWriter to capture status code
		ww := &responseWriterWrapper{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(ww, r)

		a.logger.Info("request handled",
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.statusCode,
			"duration", time.Since(start),
			"remote_addr", r.RemoteAddr,
		)
	})
}

type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriterWrapper) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func respondJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("failed to encode response", "error", err)
	}
}
