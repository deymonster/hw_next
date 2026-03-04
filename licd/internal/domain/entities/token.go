package entities

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// LicenseClaims represents the structure of the JWT license token
type LicenseClaims struct {
	jwt.RegisteredClaims

	// Custom claims matching the API contract
	LicenseID       string `json:"lid"`
	INN             string `json:"inn"`
	MaxAgents       int    `json:"max"`
	FingerprintHash string `json:"fph"`
	ActivationDate  string `json:"act"` // ISO8601
	KeyVersion      int    `json:"ver"`
	Status          string `json:"sts"` // active, trial, expired, revoked
}

// IsActive checks if the license status is active
func (c *LicenseClaims) IsActive() bool {
	return c.Status == "active"
}

// GetExpiresAt returns the expiration time
func (c *LicenseClaims) GetExpiresAt() time.Time {
	if c.ExpiresAt == nil {
		return time.Time{}
	}
	return c.ExpiresAt.Time
}
