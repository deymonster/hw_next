package usecases_test

import (
	"context"
	"strings"
	"testing"

	"github.com/deymonster/licd/internal/application/usecases"
)

func TestDeviceUseCase_RequestLicense(t *testing.T) {
	// Initialize with nil dependencies as RequestLicense only uses fingerprint generation currently
	uc := usecases.NewDeviceUseCase(nil, nil, 10, "test-job", "test-salt")

	// Test requesting a license with a dummy INN
	err := uc.RequestLicense(context.Background(), "1234567890")
	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	// Verify we hit the "not implemented" stage (Stage 3 pending)
	expectedErrorPart := "license server client not implemented"
	if !strings.Contains(err.Error(), expectedErrorPart) {
		t.Errorf("Expected error containing %q, got %q", expectedErrorPart, err.Error())
	}

	// Verify the error message includes the fingerprint (proof that generation worked)
	if !strings.Contains(err.Error(), "Fingerprint:") {
		t.Errorf("Expected error to contain fingerprint, got %q", err.Error())
	}
}

func TestDeviceUseCase_GetSystemFingerprint(t *testing.T) {
	uc := usecases.NewDeviceUseCase(nil, nil, 10, "test-job", "test-salt")

	fp, err := uc.GetSystemFingerprint()
	if err != nil {
		t.Fatalf("Failed to generate fingerprint: %v", err)
	}

	if fp == "" {
		t.Error("Fingerprint is empty")
	}
	// Hex encoded SHA256 is 64 chars
	if len(fp) != 64 {
		t.Errorf("Fingerprint length expected 64, got %d", len(fp))
	}
}