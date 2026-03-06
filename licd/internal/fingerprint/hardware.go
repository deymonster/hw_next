package fingerprint

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"runtime"
	"strings"
)

const (
	// Paths to hardware information files
	productUUIDPath = "/sys/class/dmi/id/product_uuid"
	cpuinfoPath     = "/proc/cpuinfo"
	machineIDPath   = "/etc/machine-id"
)

// Generate creates a hardware-based fingerprint for license binding
// Algorithm:
// 1. Read /sys/class/dmi/id/product_uuid (motherboard UUID)
// 2. Read /proc/cpuinfo and compute SHA256 hash of STABLE fields only
// 3. Combine: product_uuid + ":" + cpuinfo_hash + ":" + salt
// 4. Return SHA256 of combined string
func Generate(salt string) (string, error) {
	// macOS fallback for local development
	if runtime.GOOS == "darwin" {
		hostname, _ := os.Hostname()
		input := fmt.Sprintf("macos-dev:%s:%s", hostname, salt)
		hash := sha256.Sum256([]byte(input))
		return hex.EncodeToString(hash[:]), nil
	}

	// Step 1: Try to read product_uuid (primary source)
	productUUID, err := readFirstLine(productUUIDPath)
	if err != nil || strings.TrimSpace(productUUID) == "" || strings.ToLower(productUUID) == "not set" {
		// Fallback to machine-id if product_uuid is unavailable
		productUUID, err = readFirstLine(machineIDPath)
		if err != nil {
			return "", fmt.Errorf("failed to read hardware identifiers: %w", err)
		}
	}

	productUUID = strings.TrimSpace(productUUID)

	// Step 2: Read cpuinfo and compute hash (STABLE fields only)
	cpuinfoHash, err := hashStableCpuInfo(cpuinfoPath)
	if err != nil {
		// If cpuinfo is not available, use empty hash (for VMs/containers)
		cpuinfoHash = "no_cpuinfo"
	}

	// Step 3: Combine all components
	input := fmt.Sprintf("%s:%s:%s", productUUID, cpuinfoHash, salt)

	// Step 4: Compute final fingerprint
	hash := sha256.Sum256([]byte(input))
	fingerprint := hex.EncodeToString(hash[:])

	return fingerprint, nil
}

// GetHardwareInfo returns raw hardware identifiers for debugging/display
func GetHardwareInfo() map[string]string {
	info := make(map[string]string)

	// Product UUID
	if uuid, err := readFirstLine(productUUIDPath); err == nil {
		info["product_uuid"] = strings.TrimSpace(uuid)
	} else {
		info["product_uuid"] = ""
		info["product_uuid_error"] = err.Error()
	}

	// Machine ID (fallback)
	if machineID, err := readFirstLine(machineIDPath); err == nil {
		info["machine_id"] = strings.TrimSpace(machineID)
	} else {
		info["machine_id"] = ""
	}

	// CPU Info hash
	if cpuHash, err := hashStableCpuInfo(cpuinfoPath); err == nil {
		info["cpuinfo_hash"] = cpuHash
	} else {
		info["cpuinfo_hash"] = ""
		info["cpuinfo_error"] = err.Error()
	}

	return info
}

// readFirstLine reads the first line from a file
func readFirstLine(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	// Return first line only (some files have trailing newlines)
	lines := strings.Split(string(data), "\n")
	if len(lines) > 0 {
		return lines[0], nil
	}
	return string(data), nil
}

// hashStableCpuInfo reads cpuinfo and hashes only stable fields to avoid mismatches due to cpu MHz changes
func hashStableCpuInfo(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}

	lines := strings.Split(string(data), "\n")
	var stableLines []string

	for _, line := range lines {
		line = strings.TrimSpace(line)
		// Filter only stable fields that do not change at runtime
		// We EXCLUDE "cpu MHz", "bogomips", etc.
		if strings.HasPrefix(line, "vendor_id") ||
			strings.HasPrefix(line, "model name") ||
			strings.HasPrefix(line, "cache size") ||
			strings.HasPrefix(line, "microcode") ||
			strings.HasPrefix(line, "cpu cores") ||
			strings.HasPrefix(line, "physical id") {
			stableLines = append(stableLines, line)
		}
	}

	if len(stableLines) == 0 {
		// Fallback to "empty" if no stable lines found, to ensure stability
		return "empty_stable_cpuinfo", nil
	}

	input := strings.Join(stableLines, "\n")
	hash := sha256.Sum256([]byte(input))
	return hex.EncodeToString(hash[:]), nil
}
