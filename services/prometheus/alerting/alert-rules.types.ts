import { Prisma } from '@prisma/client'

/**
 * Базовые enum'ы для AlertRule
 */
export enum AlertCategory {
	HARDWARE_CHANGE = 'HARDWARE_CHANGE',
	CPU_MONITORING = 'CPU_MONITORING',
	DISK_MONITORING = 'DISK_MONITORING',
	NETWORK_MONITORING = 'NETWORK_MONITORING'
}

export enum AlertSeverity {
	INFO = 'INFO',
	WARNING = 'WARNING',
	CRITICAL = 'CRITICAL'
}

export enum ComparisonOperator {
	GREATER_THAN = 'GREATER_THAN',
	LESS_THAN = 'LESS_THAN',
	GREATER_EQUAL = 'GREATER_EQUAL',
	LESS_EQUAL = 'LESS_EQUAL',
	EQUAL = 'EQUAL',
	NOT_EQUAL = 'NOT_EQUAL'
}

/**
 * Интерфейс для создания AlertRule в базе данных
 */
export type IAlertRuleCreateInput = Prisma.AlertRuleCreateInput

/**
 * Интерфейс для поиска AlertRule в базе данных
 * Используем Prisma типы напрямую для совместимости
 */
export type IAlertRuleFindManyArgs = Prisma.AlertRuleFindManyArgs

/**
 * Статистика правил
 */
export interface AlertRulesStats {
	total: number
	active: number
	inactive: number
	byCategory: Record<string, number>
}
