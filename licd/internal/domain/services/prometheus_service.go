package services

import (
	"context"
	"github.com/deymonster/licd/internal/domain/entities"
)

// PrometheusService определяет интерфейс для работы с Prometheus targets
type PrometheusService interface {
	// GetTargets возвращает список целей для Prometheus Service Discovery
	GetTargets(ctx context.Context) ([]*entities.Target, error)
	
	// GetJobName возвращает имя задачи для Prometheus
	GetJobName(ctx context.Context) (string, error)
}