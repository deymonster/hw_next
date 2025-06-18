import { AlertCategory, AlertSeverity, ChangeType, ComparisonOperator } from './alert-rules.types';

/**
 * Конфигурация правила для Prometheus (отличается от базы данных)
 */
export interface AlertRuleConfig {
  id: string;
  name: string;
  category: AlertCategory;
  metric: string;
  expression: string;
  threshold?: number;
  operator?: ComparisonOperator;
  duration: string;
  severity: AlertSeverity;
  description: string;
  labels?: Record<string, string>;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  changeType?: ChangeType;
  includeInstance?: boolean;
}

/**
 * Запрос на создание правила через API
 */
export interface CreateAlertRuleRequest {
  name: string;
  category: AlertCategory;
  metric: string;
  expression?: string; 
  threshold?: number;
  operator?: ComparisonOperator;
  duration: string;
  severity: AlertSeverity;
  description: string;
  labels?: Record<string, string>;
  enabled?: boolean;
  changeType?: ChangeType;
  includeInstance?: boolean;
}

/**
 * Запрос на обновление правила через API
 */
export interface UpdateAlertRuleRequest {
  name?: string;
  category: AlertCategory;
  metric?: string;
  expression?: string; 
  threshold?: number;
  operator?: ComparisonOperator;
  duration?: string;
  severity?: AlertSeverity;
  description?: string;
  labels?: Record<string, string>;
  enabled?: boolean;
  changeType?: ChangeType;
}

/**
 * Результат валидации правила
 */
export interface AlertRuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}