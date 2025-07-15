import {
	AlertRuleConfig,
	AlertRuleValidationResult,
	CreateAlertRuleRequest,
	UpdateAlertRuleRequest
} from './alert-rules.config.types'
import { ComparisonOperator } from './alert-rules.types'

/**
 * Интерфейс для сервиса работы с конфигурационными файлами Prometheus
 * Отвечает ТОЛЬКО за работу с файлами и валидацию
 */
export interface IAlertRulesConfigService {
	/**
	 * Валидировать правило
	 */
	validateRule(
		config: CreateAlertRuleRequest | UpdateAlertRuleRequest
	): Promise<AlertRuleValidationResult>

	/**
	 * Перезагрузить конфигурацию Prometheus
	 */
	reloadPrometheus(): Promise<boolean>

	/**
	 * Экспортировать правила в YAML
	 */
	exportToYaml(rules: AlertRuleConfig[]): Promise<string>

	/**
	 * Импортировать правила из YAML
	 */
	importFromYaml(yamlContent: string): Promise<AlertRuleConfig[]>

	/**
	 * Валидировать PromQL выражение
	 */
	validateExpression(expression: string): boolean

	/**
	 * Конвертировать оператор в PromQL
	 */
	convertOperatorToPromQL(operator: ComparisonOperator): string
}
