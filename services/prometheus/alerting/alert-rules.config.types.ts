import { ChangeType } from '@prisma/client'

import {
	AlertCategory,
	AlertSeverity,
	ComparisonOperator
} from './alert-rules.types'

/**
 * Конфигурация правила для Prometheus (отличается от базы данных)
 */
export interface AlertRuleConfig {
	id: string
	name: string
	category: AlertCategory
	metric: string
	expression: string
	threshold?: number
	operator?: ComparisonOperator
	duration: string
	severity: AlertSeverity
	description: string
	labels?: Record<string, string>
	enabled: boolean
	createdAt?: Date
	updatedAt?: Date
	includeInstance?: boolean
}

/**
 * Запрос на создание правила через API
 */
export interface CreateAlertRuleRequest {
	name: string
	category: AlertCategory
	metric: string
	metrics?: string[]
	expression?: string
	threshold?: number
	operator?: ComparisonOperator
	duration: string
	severity: AlertSeverity
	description: string
	labels?: Record<string, string>
	enabled?: boolean
}

/**
 * Запрос на обновление правила через API
 */
export interface UpdateAlertRuleRequest {
	name?: string
	category: AlertCategory
	metric?: string
	expression?: string
	threshold?: number
	operator?: ComparisonOperator
	duration?: string
	severity?: AlertSeverity
	description?: string
	labels?: Record<string, string>
	enabled?: boolean
}

/**
 * Результат валидации правила
 */
export interface AlertRuleValidationResult {
	isValid: boolean
	errors: string[]
	warnings: string[]
}

/**
 * Адаптер файловой системы
 */
export interface FileSystemAdapter {
	readFile: (path: string, encoding?: string) => Promise<string>
	writeFile: (
		path: string,
		content: string,
		encoding?: string
	) => Promise<void>
}

type FetchResponse = globalThis.Response
type FetchRequestInit = globalThis.RequestInit

/**
 * HTTP-клиент
 */
export interface HttpClient {
	post: (url: string, init?: FetchRequestInit) => Promise<FetchResponse>
}

/**
 * Правило Prometheus
 */
export interface PrometheusRule {
	alert: string
	expr: string
	for?: string
	labels: Record<string, string>
	annotations: Record<string, string>
}

/**
 * Группа правил Prometheus
 */
export interface PrometheusRuleGroup {
	name: string
	rules: PrometheusRule[]
}
