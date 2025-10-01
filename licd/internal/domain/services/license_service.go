package services

import (
	"context"
	"github.com/deymonster/licd/internal/domain/entities"
)

// LicenseService определяет интерфейс для работы с лицензиями
type LicenseService interface {
	// GetLicenseStatus возвращает статус лицензии
	GetLicenseStatus(ctx context.Context) (*entities.License, error)
	
	// ValidateLicense проверяет валидность лицензии
	ValidateLicense(ctx context.Context) error
}