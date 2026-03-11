package handlers_test

import (
	"context"

	"github.com/deymonster/licd/internal/domain/entities"
)

// MockDeviceUseCase - mock for DeviceUseCase to test handlers
// Since DeviceUseCase is a struct in the current implementation, we need to create an interface
// or wrap the struct. For now, we will create a mock struct that embeds or mimics the behavior.
// Ideally, DeviceUseCase should be an interface.

// For this test, we will create a separate interface in the test package that matches the methods we need
type DeviceUseCaseInterface interface {
	GetLicenseStatus(ctx context.Context) (*entities.LicenseStatus, error)
	RegisterInstance(ctx context.Context, inn string) error
	UpdateLicense(ctx context.Context, token string, inn string) error
	RefreshLicense(ctx context.Context) error
}

type MockDeviceUseCase struct {
	GetLicenseStatusFunc func(ctx context.Context) (*entities.LicenseStatus, error)
	RegisterInstanceFunc func(ctx context.Context, inn string) error
	UpdateLicenseFunc    func(ctx context.Context, token string, inn string) error
	RefreshLicenseFunc   func(ctx context.Context) error
}

func (m *MockDeviceUseCase) GetLicenseStatus(ctx context.Context) (*entities.LicenseStatus, error) {
	if m.GetLicenseStatusFunc != nil {
		return m.GetLicenseStatusFunc(ctx)
	}
	return &entities.LicenseStatus{}, nil
}

func (m *MockDeviceUseCase) RegisterInstance(ctx context.Context, inn string) error {
	if m.RegisterInstanceFunc != nil {
		return m.RegisterInstanceFunc(ctx, inn)
	}
	return nil
}

func (m *MockDeviceUseCase) UpdateLicense(ctx context.Context, token string, inn string) error {
	if m.UpdateLicenseFunc != nil {
		return m.UpdateLicenseFunc(ctx, token, inn)
	}
	return nil
}

func (m *MockDeviceUseCase) RefreshLicense(ctx context.Context) error {
	if m.RefreshLicenseFunc != nil {
		return m.RefreshLicenseFunc(ctx)
	}
	return nil
}
