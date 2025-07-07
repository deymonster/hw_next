import * as yaml from 'js-yaml'
import * as path from 'path'

import { fetchAdapter, fsAdapter } from './alert-rules.adapters'
import { IAlertRulesConfigService } from './alert-rules.config.service.interface'
import {
	AlertRuleConfig,
	AlertRuleValidationResult,
	CreateAlertRuleRequest,
	FileSystemAdapter,
	HttpClient,
	UpdateAlertRuleRequest
} from './alert-rules.config.types'
import {
	AlertCategory,
	AlertSeverity,
	ComparisonOperator
} from './alert-rules.types'

/**
 * Сервис для управления правилами алертов Prometheus
 *
 * @remarks
 * Реализует следующие функции:
 * - Валидацию правил алертов перед сохранением
 * - Конвертацию между внутренним форматом и форматом Prometheus
 * - Экспорт/импорт правил в YAML формате
 * - Взаимодействие с API Prometheus (перезагрузка конфигурации)
 * - Работу с файловой системой (сохранение/загрузка правил)
 *
 * Сервис использует адаптеры для файловой системы и HTTP-клиента,
 * что позволяет легко подменять реализации для тестирования.
 */
export class AlertRulesConfigService implements IAlertRulesConfigService {
	/**
	 * Создает экземпляр сервиса конфигурации правил
	 * @param config - Конфигурация подключения
	 * @param config.prometheusUrl - URL API Prometheus
	 * @param config.rulesPath - Путь к директории с файлами правил
	 * @param fileSystem - Адаптер файловой системы (по умолчанию fs/promises)
	 * @param httpClient - HTTP клиент (по умолчанию fetch API)
	 */
	constructor(
		private readonly config: {
			prometheusUrl: string
			rulesPath: string
		},
		private readonly fileSystem: FileSystemAdapter = fsAdapter,
		private readonly httpClient: HttpClient = fetchAdapter
	) {}

	// ==================== Валидация правил ====================

	/**
	 * Валидирует правило алерта перед сохранением
	 *
	 * @param config - Конфигурация правила для валидации
	 * @returns Promise с результатом валидации, содержащим:
	 *          - isValid: общий результат валидации
	 *          - errors: массив критических ошибок
	 *          - warnings: массив предупреждений
	 *
	 * @example
	 * const result = await service.validateRule(ruleConfig);
	 * if (!result.isValid) {
	 *   console.error('Ошибки валидации:', result.errors);
	 * }
	 */
	async validateRule(
		config: CreateAlertRuleRequest | UpdateAlertRuleRequest
	): Promise<AlertRuleValidationResult> {
		const errors: string[] = []
		const warnings: string[] = []

		this.validateRequiredFields(config, errors)
		this.validateMetricFields(config, errors)
		this.validateCategory(config, errors)
		this.validateThreshold(config, errors, warnings)
		this.validateDuration(config, errors)
		return { isValid: errors.length === 0, errors, warnings }
	}

	/**
	 * Проверяет обязательные поля правила
	 * @param config - Конфигурация правила
	 * @param errors - Массив для накопления ошибок
	 * @private
	 */
	private validateRequiredFields(
		config: CreateAlertRuleRequest | UpdateAlertRuleRequest,
		errors: string[]
	) {
		if ('name' in config) {
			if (!config.name?.trim()) {
				errors.push('Название правила обязательно')
			} else if (config.name.length > 100) {
				errors.push('Название правила не должно превышать 100 символов')
			}
		}
	}

	/**
	 * Проверяет корректность метрики
	 * @param config - Конфигурация правила
	 * @param errors - Массив для накопления ошибок
	 * @private
	 */
	private validateMetricFields(
		config: CreateAlertRuleRequest | UpdateAlertRuleRequest,
		errors: string[]
	): void {
		if ('metric' in config) {
			if (!config.metric?.trim()) {
				errors.push('Метрика обязательна')
			} else if (!this.validateMetricName(config.metric)) {
				errors.push('Некорректное название метрики')
			}
		}
	}

	/**
	 * Проверяет корректность категории
	 * @param config - Конфигурация правила
	 * @param errors - Массив для накопления ошибок
	 * @private
	 */
	private validateCategory(
		config: CreateAlertRuleRequest | UpdateAlertRuleRequest,
		errors: string[]
	): void {
		if (
			'category' in config &&
			!Object.values(AlertCategory).includes(config.category)
		) {
			errors.push('Некорректная категория правила')
		}
	}

	/**
	 * Проверяет корректность порогового значения
	 * @param config - Конфигурация правила
	 * @param errors - Массив для накопления ошибок
	 * @param warnings - Массив для накопления предупреждений
	 * @private
	 */
	private validateThreshold(
		config: CreateAlertRuleRequest | UpdateAlertRuleRequest,
		errors: string[],
		warnings: string[]
	): void {
		if (config.threshold !== undefined) {
			if (typeof config.threshold !== 'number' || config.threshold < 0) {
				errors.push(
					'Пороговое значение должно быть положительным числом'
				)
			} else if (config.threshold > 100) {
				warnings.push(
					'Высокое пороговое значение может привести к частым срабатываниям'
				)
			}
		}
	}

	/**
	 * Проверяет корректность формата длительности
	 * @param config - Конфигурация правила
	 * @param errors - Массив для накопления ошибок
	 * @private
	 */
	private validateDuration(
		config: CreateAlertRuleRequest | UpdateAlertRuleRequest,
		errors: string[]
	): void {
		if (config.duration && !this.validateDurationFormat(config.duration)) {
			errors.push(
				'Некорректный формат длительности (например: 5m, 1h, 30s)'
			)
		}
	}

	// ==================== Работа с Prometheus API ====================

	/**
	 * Перезагружает конфигурацию Prometheus через API
	 *
	 * @remarks
	 * Отправляет POST-запрос на эндпоинт /-/reload Prometheus API
	 *
	 * @returns Promise с результатом операции:
	 *          - true: перезагрузка успешна
	 *          - false: произошла ошибка
	 *
	 * @throws {Error} Если Prometheus URL не настроен
	 */
	async reloadPrometheus(): Promise<boolean> {
		if (!this.config.prometheusUrl) {
			throw new Error('Prometheus URL не настроен')
		}

		const reloadUrl = `${this.config.prometheusUrl}/prometheus/-/reload`
		console.log(`Отправка запроса на перезагрузку Prometheus: ${reloadUrl}`)

		const username = process.env.PROMETHEUS_AUTH_USERNAME || 'admin'
		const password = process.env.PROMETHEUS_AUTH_PASSWORD || 'admin'
		const authHeader =
			'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
		try {
			const response = await this.httpClient.post(reloadUrl, {
				headers: {
					Authorization: authHeader
				}
			})

			if (!response.ok) {
				const statusText = response.statusText || 'Нет текста статуса'
				let responseBody = 'Не удалось получить тело ответа'

				try {
					// Пытаемся прочитать тело ответа для дополнительной информации
					responseBody = await response.text()
				} catch (bodyError) {
					console.error(
						'Не удалось прочитать тело ответа:',
						bodyError
					)
				}

				console.error(
					`Ошибка перезагрузки Prometheus: URL=${reloadUrl}, ` +
						`Статус=${response.status}, Текст=${statusText}, ` +
						`Тело ответа=${responseBody}`
				)
				return false
			}

			console.log('Prometheus успешно перезагружен')
			return true
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			console.error(
				`Исключение при перезагрузке Prometheus: URL=${reloadUrl}, ` +
					`Ошибка=${errorMessage}, ` +
					`Стек=${error instanceof Error ? error.stack : 'Стек недоступен'}`
			)
			return false
		}
	}

	// ==================== Экспорт/импорт YAML ====================

	/**
	 * Экспортирует правила в YAML формат, совместимый с Prometheus
	 *
	 * @param rules - Массив правил для экспорта
	 * @returns Promise с YAML строкой, содержащей конфигурацию правил
	 *
	 * @example
	 * const yaml = await service.exportToYaml(rules);
	 * console.log(yaml);
	 */
	async exportToYaml(rules: AlertRuleConfig[]): Promise<string> {
		const groups = this.groupRulesByCategory(rules)

		const yamlConfig = {
			groups: Object.entries(groups).map(([category, categoryRules]) => ({
				name: `${category.toLowerCase()}_alerts`,
				rules: categoryRules.map(rule =>
					this.convertToPrometheusRule(rule)
				)
			}))
		}

		return yaml.dump(yamlConfig, { indent: 2 })
	}

	/**
	 * Импортирует правила из YAML формата Prometheus
	 *
	 * @param yamlContent - YAML строка с конфигурацией
	 * @returns Promise с массивом правил в внутреннем формате
	 *
	 * @throws {Error} Если произошла ошибка парсинга YAML или валидации данных
	 *
	 * @example
	 * try {
	 *   const rules = await service.importFromYaml(yamlContent);
	 * } catch (error) {
	 *   console.error('Ошибка импорта:', error.message);
	 * }
	 */
	async importFromYaml(yamlContent: string): Promise<AlertRuleConfig[]> {
		try {
			const config = yaml.load(yamlContent) as any
			const rules: AlertRuleConfig[] = []

			if (config.groups) {
				for (const group of config.groups) {
					if (group.rules) {
						for (const rule of group.rules) {
							rules.push(
								this.convertFromPrometheusRule(rule, group.name)
							)
						}
					}
				}
			}

			return rules
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error)
			throw new Error(`Ошибка парсинга YAML: ${errorMessage}`)
		}
	}

	// ==================== Работа с файловой системой ====================

	/**
	 * Сохраняет правила в файл в формате YAML
	 *
	 * @param rules - Массив правил для сохранения
	 * @param filename - Имя файла (без пути)
	 * @returns Promise, который разрешается после успешного сохранения
	 *
	 * @throws {Error} Если произошла ошибка записи файла
	 */
	async saveRulesToFile(
		rules: AlertRuleConfig[],
		filename: string
	): Promise<void> {
		const yamlContent = await this.exportToYaml(rules)
		const filePath = path.join(this.config.rulesPath, filename)

		try {
			await this.fileSystem.writeFile(filePath, yamlContent)
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			throw new Error(
				`Ошибка сохранения файла ${filename}: ${errorMessage}`
			)
		}
	}

	/**
	 * Загружает правила из файла YAML
	 *
	 * @param filename - Имя файла (без пути)
	 * @returns Promise с массивом загруженных правил
	 *
	 * @throws {Error} Если файл не существует или произошла ошибка чтения/парсинга
	 */
	async loadRulesFromFile(filename: string): Promise<AlertRuleConfig[]> {
		const filePath = path.join(this.config.rulesPath, filename)

		try {
			const yamlContent = await this.fileSystem.readFile(filePath)
			return this.importFromYaml(yamlContent)
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			throw new Error(
				`Ошибка загрузки файла ${filename}: ${errorMessage}`
			)
		}
	}

	// ==================== Вспомогательные методы ====================

	/**
	 * Валидирует название метрики согласно правилам Prometheus
	 *
	 * @param metric - Название метрики для проверки
	 * @returns true, если название валидно, иначе false
	 *
	 * @private
	 */
	private validateMetricName(metric: string): boolean {
		const metricPattern = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/
		return metricPattern.test(metric)
	}

	/**
	 * Валидирует строку длительности
	 * Проверяет соответствие строки формату Prometheus (число + единица измерения)
	 * @param duration Строка длительности (например, "5m", "1h")
	 * @returns true, если строка валидна, иначе false
	 * @private
	 */
	private validateDurationFormat(duration: string): boolean {
		const durationPattern = /^\d+[smhd]$/
		return durationPattern.test(duration)
	}

	/**
	 * Валидирует PromQL выражение на базовом уровне
	 *
	 * @param expression - PromQL выражение для проверки
	 * @returns true, если выражение валидно, иначе false
	 */
	validateExpression(expression: string): boolean {
		const promqlPattern = /^[a-zA-Z_:][a-zA-Z0-9_:]*.*$/
		return promqlPattern.test(expression.trim())
	}

	/**
	 * Конвертирует оператор сравнения в PromQL формат
	 * Преобразует enum ComparisonOperator в строковый оператор PromQL
	 * @param operator Оператор сравнения из enum
	 * @returns Строковое представление оператора для PromQL
	 */
	convertOperatorToPromQL(operator: ComparisonOperator): string {
		const operatorMap = {
			[ComparisonOperator.GREATER_THAN]: '>',
			[ComparisonOperator.LESS_THAN]: '<',
			[ComparisonOperator.GREATER_EQUAL]: '>=',
			[ComparisonOperator.LESS_EQUAL]: '<=',
			[ComparisonOperator.EQUAL]: '==',
			[ComparisonOperator.NOT_EQUAL]: '!='
		}
		return operatorMap[operator] || '>'
	}

	// ==================== Приватные методы преобразования форматов ====================

	/**
	 * Группирует правила по категориям для экспорта в Prometheus
	 *
	 * @param rules - Массив правил для группировки
	 * @returns Объект, где ключи - категории, значения - массивы правил
	 *
	 * @private
	 */
	private groupRulesByCategory(
		rules: AlertRuleConfig[]
	): Record<string, AlertRuleConfig[]> {
		return rules.reduce(
			(groups, rule) => {
				const category = rule.category
				if (!groups[category]) {
					groups[category] = []
				}
				groups[category].push(rule)
				return groups
			},
			{} as Record<string, AlertRuleConfig[]>
		)
	}

	/**
	 * Конвертирует правило из внутреннего формата в формат Prometheus
	 *
	 * @param rule - Правило в внутреннем формате
	 * @returns Объект правила в формате Prometheus
	 *
	 * @private
	 */
	private convertToPrometheusRule(rule: AlertRuleConfig): any {
		// Базовые аннотации для всех типов правил
		const annotations: Record<string, string> = {
			summary: rule.description,
			description: `Рабочее место: {{ $labels.instance }}`
		}

		// Добавляем информацию о текущем значении и пороге, если они есть
		if (rule.threshold !== undefined) {
			annotations.description += `\nТекущее значение: {{ $value }}\nПороговое значение: ${rule.threshold}`
		}

		// Специальное форматирование для правил категории HARDWARE_CHANGE
		if (rule.category === AlertCategory.HARDWARE_CHANGE) {
			annotations.summary =
				'Конфигурация оборудования была изменена на {{ $labels.instance }}'
			annotations.description =
				'Рабочее место: {{ $labels.instance }}\nКонфигурация оборудования была изменена с момента последнего запуска.'
		} else if (rule.threshold !== undefined) {
			annotations.description += `\nТекущее значение: {{ $value }}\nПороговое значение: ${rule.threshold}`
		}

		// Формируем объект правила для Prometheus
		return {
			alert: rule.name,
			expr: rule.expression,
			for: rule.duration || '0m',
			labels: {
				severity: rule.severity.toLowerCase(),
				category: rule.category.toLowerCase(),
				...(rule.labels || {})
			},
			annotations
		}
	}

	/**
	 * Конвертирует правило из формата Prometheus в формат приложения
	 * Извлекает информацию из объекта Prometheus и создает объект AlertRuleConfig
	 * @param rule Правило в формате Prometheus
	 * @param groupName Название группы правил
	 * @returns Объект правила в формате приложения
	 * @private
	 */
	private convertFromPrometheusRule(
		rule: any,
		groupName: string
	): AlertRuleConfig {
		return {
			id: '', // Будет установлен при сохранении в БД
			name: rule.alert,
			category: this.extractCategoryFromGroup(groupName),
			metric: this.extractMetricFromExpression(rule.expr),
			expression: rule.expr,
			duration: rule.for || '5m',
			severity: (rule.labels?.severity?.toUpperCase() ||
				'WARNING') as AlertSeverity,
			description:
				rule.annotations?.summary ||
				rule.annotations?.description ||
				'',
			labels: rule.labels || {},
			enabled: true
		}
	}

	/**
	 * Извлекает категорию из названия группы правил
	 * Определяет категорию на основе ключевых слов в названии группы
	 * @param groupName Название группы правил
	 * @returns Категория правила
	 * @private
	 */
	private extractCategoryFromGroup(groupName: string): AlertCategory {
		if (groupName.includes('hardware')) return AlertCategory.HARDWARE_CHANGE
		if (groupName.includes('cpu')) return AlertCategory.CPU_MONITORING
		if (groupName.includes('disk')) return AlertCategory.DISK_MONITORING
		if (groupName.includes('network'))
			return AlertCategory.NETWORK_MONITORING
		return AlertCategory.HARDWARE_CHANGE
	}

	/**
	 * Извлекает название метрики из PromQL выражения
	 * Находит первую часть выражения, соответствующую паттерну метрики
	 * @param expression Строка с PromQL выражением
	 * @returns Название метрики или 'unknown_metric', если не удалось извлечь
	 * @private
	 */
	private extractMetricFromExpression(expression: string): string {
		const match = expression.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)/)
		return match ? match[1] : 'unknown_metric'
	}
}
