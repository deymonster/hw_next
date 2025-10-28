import { EventEmitter } from 'events'

import { LoggerService, LogLevel } from '../logger/logger.interface'
import { Logger } from '../logger/logger.service'
import { MetricType, PROMETHEUS_METRICS } from './metrics'
import {
	AgentStatus,
	DiskInfo,
	MetricTimeSeries,
	PrometheusApiResponse,
	PrometheusServiceConfig,
	TimeRange,
	TimeRangeParams
} from './prometheus.interfaces'
import { PrometheusParser } from './prometheus.parser'

// import { STATIC, DYNAMIC, PROCESS } from '@/mocks/prometheus.mock';

/**
 * Сервис для работы с Prometheus API
 * Обеспечивает:
 * - Управление целями мониторинга (добавление/удаление устройств)
 * - Получение метрик устройств
 * - Кэширование метрик
 * - Подписку на обновления метрик
 * - Автоматическое обновление метрик
 * - Очистку устаревших данных
 */
export class PrometheusService {
	private readonly config: PrometheusServiceConfig
	private readonly emitter = new EventEmitter()
	private readonly logger = Logger.getInstance()
	private readonly staticDataCache: Map<
		string,
		{
			lastUpdate: number
			data: {
				systemInfo: any
				hardwareInfo: any
			}
		}
	> = new Map()

	private async log(level: keyof LogLevel, message: string, ...args: any[]) {
		await this.logger.log(
			LoggerService.PROMETHEUS_SERVICE,
			level,
			message,
			...args
		)
	}

	private readonly dynamicMetricsCache: Map<
		string,
		{
			lastUpdate: number
			metrics: any
			subscribers: number
		}
	> = new Map()

	private readonly updateInterval = 30000 // 30 секунд
	private readonly staticDataMaxAge = 24 * 60 * 60 * 1000 // 24 часа
	private readonly dynamicDataMaxAge = 120000 // 2 минуты

	constructor(config: PrometheusServiceConfig) {
		this.config = config
		this.startMetricsCollection()
	}

	/**
	 * Получает статические данные устройства (системная информация и железо)
	 * Кэширует данные на 24 часа
	 */
	public async getDeviceStaticData(deviceId: string) {
		const cached = this.staticDataCache.get(deviceId)
		const now = Date.now()

		// Проверяем актуальность только статического кэша
		if (cached && now - cached.lastUpdate < this.staticDataMaxAge) {
			// Попробуем дополнить ответ актуальной динамикой,
			// но если она недоступна — вернём кэшированную статику
			try {
				const dynamicResponse = await this.getMetricsByIp(
					deviceId,
					MetricType.DYNAMIC
				)
				const dynamicParser = new PrometheusParser(dynamicResponse)

				const [diskUsage, networkMetrics] = await Promise.all([
					dynamicParser.getDiskMetrics(),
					dynamicParser.getNetworkMetrics()
				])

				const parseSizeToGb = (value?: string): number | undefined => {
					if (!value) return undefined
					const numericValue = Number(value)
					if (!Number.isNaN(numericValue) && numericValue > 0) {
						if (numericValue > 1024 * 1024 * 1024) {
							return Number(
								(numericValue / (1024 * 1024 * 1024)).toFixed(2)
							)
						}
						return Number(numericValue.toFixed(2))
					}
					const match = value.match(/([\d.,]+)/)
					if (!match) return undefined
					const parsed = Number(match[1].replace(',', '.'))
					if (Number.isNaN(parsed)) return undefined
					if (/tb/i.test(value))
						return Number((parsed * 1024).toFixed(2))
					return Number(parsed.toFixed(2))
				}
				const normalize = (val?: string) =>
					val?.toLowerCase().replace(/\s+/g, '')

				const baseHardwareInfo = cached.data.hardwareInfo
				const disks = (baseHardwareInfo?.disks || []).map(
					(disk: DiskInfo) => {
						const matchedUsage = diskUsage.find(
							metric =>
								normalize(metric.disk) === normalize(disk.id) ||
								normalize(metric.disk) === normalize(disk.model)
						)
						return {
							...disk,
							sizeGb:
								matchedUsage?.usage.total ??
								parseSizeToGb(disk.size),
							usage: matchedUsage?.usage
						}
					}
				)

				return {
					systemInfo: cached.data.systemInfo,
					hardwareInfo: {
						...baseHardwareInfo,
						disks,
						diskUsage,
						networkInterfaces:
							networkMetrics.length > 0
								? networkMetrics
								: baseHardwareInfo?.networkInterfaces || []
					}
				}
			} catch {
				// Динамика недоступна — возвращаем чисто статический кэш
				return cached.data
			}
		}

		// 1) Получаем только статические метрики и парсим
		const staticResponse = await this.getMetricsByIp(
			deviceId,
			MetricType.STATIC
		)
		const staticParser = new PrometheusParser(staticResponse)
		const [systemInfo, baseHardwareInfo] = await Promise.all([
			staticParser.getSystemInfo(),
			staticParser.getHardwareInfo()
		])

		const staticData = {
			systemInfo,
			hardwareInfo: baseHardwareInfo
		}

		// 2) Кэшируем только статическую часть на 24 часа
		this.staticDataCache.set(deviceId, {
			lastUpdate: now,
			data: staticData
		})

		// 3) Пытаемся получить динамику, но она не влияет на кэш и не блокирует ответ
		try {
			const dynamicResponse = await this.getMetricsByIp(
				deviceId,
				MetricType.DYNAMIC
			)
			const dynamicParser = new PrometheusParser(dynamicResponse)
			const [diskUsage, networkMetrics] = await Promise.all([
				dynamicParser.getDiskMetrics(),
				dynamicParser.getNetworkMetrics()
			])

			const parseSizeToGb = (value?: string): number | undefined => {
				if (!value) return undefined
				const numericValue = Number(value)
				if (!Number.isNaN(numericValue) && numericValue > 0) {
					if (numericValue > 1024 * 1024 * 1024) {
						return Number(
							(numericValue / (1024 * 1024 * 1024)).toFixed(2)
						)
					}
					return Number(numericValue.toFixed(2))
				}
				const match = value.match(/([\d.,]+)/)
				if (!match) return undefined
				const parsed = Number(match[1].replace(',', '.'))
				if (Number.isNaN(parsed)) return undefined
				if (/tb/i.test(value)) return Number((parsed * 1024).toFixed(2))
				return Number(parsed.toFixed(2))
			}
			const normalize = (val?: string) =>
				val?.toLowerCase().replace(/\s+/g, '')

			const disks = (baseHardwareInfo?.disks || []).map(
				(disk: DiskInfo) => {
					const matchedUsage = diskUsage.find(
						metric =>
							normalize(metric.disk) === normalize(disk.id) ||
							normalize(metric.disk) === normalize(disk.model)
					)
					return {
						...disk,
						sizeGb:
							matchedUsage?.usage.total ??
							parseSizeToGb(disk.size),
						usage: matchedUsage?.usage
					}
				}
			)

			return {
				systemInfo,
				hardwareInfo: {
					...baseHardwareInfo,
					disks,
					diskUsage,
					networkInterfaces:
						networkMetrics.length > 0
							? networkMetrics
							: baseHardwareInfo?.networkInterfaces || []
				}
			}
		} catch (error) {
			// Если динамика упала/таймаут — возвращаем только статику
			await this.log(
				'warn',
				`[STATIC_DATA] Dynamic metrics unavailable for ${deviceId}, returning static only`,
				error
			)
			return staticData
		}
	}

	/**
	 * Подписка на динамические метрики устройства
	 */
	public subscribe(deviceId: string, callback: (metrics: any) => void) {
		const eventName = `metrics:${deviceId}`
		this.emitter.on(eventName, callback)

		// Инициализируем или обновляем запись в кэше
		const cached = this.dynamicMetricsCache.get(deviceId)
		if (cached) {
			cached.subscribers++
			// Отправляем последние известные метрики
			if (cached.metrics) {
				callback(cached.metrics)
			}
		} else {
			this.dynamicMetricsCache.set(deviceId, {
				lastUpdate: 0,
				metrics: null,
				subscribers: 1
			})
			// Запускаем сбор метрик для этого устройства
			this.updateDeviceMetrics(deviceId)
		}

		// Возвращаем функцию отписки
		return () => {
			this.emitter.removeListener(eventName, callback)
			const cache = this.dynamicMetricsCache.get(deviceId)
			if (cache) {
				cache.subscribers--
				// Если больше нет подписчиков, удаляем устройство из кэша
				if (cache.subscribers <= 0) {
					this.dynamicMetricsCache.delete(deviceId)
				}
			}
		}
	}

	/**
	 * Обновляет динамические метрики для устройства
	 */
	private async updateDeviceMetrics(deviceId: string) {
		const startTime = Date.now()

		try {
			const cached = this.dynamicMetricsCache.get(deviceId)
			if (!cached || cached.subscribers <= 0) {
				await this.log(
					'debug',
					`No subscribers for device ${deviceId}, skipping update`
				)
				return // Не обновляем метрики если нет подписчиков
			}

			// Проверяем не устарели ли данные
			const now = Date.now()
			if (
				cached.lastUpdate &&
				now - cached.lastUpdate > this.dynamicDataMaxAge
			) {
				await this.log(
					'warn',
					`Metrics for device ${deviceId} are stale`
				)
			}

			// Получаем динамические метрики

			const dynamicStartTime = Date.now()
			const dynamicResponse = await this.getMetricsByIp(
				deviceId,
				MetricType.DYNAMIC
			)
			this.log(
				'debug',
				`[METRICS] Dynamic metrics fetch took ${Date.now() - dynamicStartTime}ms`
			)
			const dynamicFetchTime = Date.now() - dynamicStartTime
			if (dynamicFetchTime > 1000) {
				// Логируем только медленные запросы
				await this.log(
					'warn',
					`Slow dynamic metrics fetch for ${deviceId}: ${dynamicFetchTime}ms`
				)
			}

			const dynamicParser = new PrometheusParser(dynamicResponse)

			const parseStartTime = Date.now()
			const processorMetrics = await dynamicParser.getProcessorMetrics()
			const networkMetrics = await dynamicParser.getNetworkMetrics()
			const diskMetrics = await dynamicParser.getDiskMetrics()
			const memoryMetrics = await dynamicParser.getMemoryMetrics()

			const parseTime = Date.now() - parseStartTime

			if (parseTime > 500) {
				await this.log(
					'warn',
					`Slow metrics parsing for ${deviceId}: ${parseTime}ms`
				)
			}

			const newMetrics = {
				processorMetrics,
				networkMetrics,
				diskMetrics,
				memoryMetrics,
				timestamp: now
			}

			// Обновляем кэш и оповещаем подписчиков только если данные изменились
			if (
				!cached.metrics ||
				this.hasMetricsChanged(cached.metrics, newMetrics)
			) {
				cached.metrics = newMetrics
				cached.lastUpdate = now
				await this.log(
					'debug',
					`Emitting updated metrics for device ${deviceId}`
				)
				this.emitter.emit(`metrics:${deviceId}`, newMetrics)
			} else {
				await this.log(
					'debug',
					`No changes detected for device ${deviceId}, skipping update`
				)
			}

			const totalTime = Date.now() - startTime
			if (totalTime > 2000) {
				await this.log(
					'warn',
					`Slow total metrics update for ${deviceId}: ${totalTime}ms`
				)
			}
		} catch (error) {
			await this.log(
				'error',
				`Error updating metrics for device ${deviceId}:`,
				error
			)
		}
	}

	/**
	 * Эффективное сравнение метрик без полной сериализации
	 */
	private hasMetricsChanged(oldMetrics: any, newMetrics: any): boolean {
		if (!oldMetrics || !newMetrics) return true

		// Сравниваем только ключевые метрики вместо полной сериализации
		return (
			oldMetrics.processorMetrics?.usage !==
				newMetrics.processorMetrics?.usage ||
			oldMetrics.memoryMetrics?.usage?.used !==
				newMetrics.memoryMetrics?.usage?.used ||
			oldMetrics.networkMetrics?.some(
				(old: any, i: number) =>
					old.performance.rx !==
						newMetrics.networkMetrics[i]?.performance.rx ||
					old.performance.tx !==
						newMetrics.networkMetrics[i]?.performance.tx
			) ||
			oldMetrics.diskMetrics?.some(
				(old: any, i: number) =>
					old.performance.rx !==
						newMetrics.diskMetrics[i]?.performance.rx ||
					old.performance.tx !==
						newMetrics.diskMetrics[i]?.performance.tx
			)
		)
	}

	/**
	 * Запускает сбор метрик только для устройств с активными подписчиками
	 */
	private startMetricsCollection() {
		const collectMetrics = async () => {
			try {
				// Получаем только устройства с активными подписчиками
				const deviceIds = Array.from(this.dynamicMetricsCache.entries())
					.filter(([_, cache]) => cache.subscribers > 0)
					.map(([deviceId]) => deviceId)

				// Обновляем метрики параллельно
				await Promise.all(
					deviceIds.map(deviceId =>
						this.updateDeviceMetrics(deviceId)
					)
				)
			} catch (error) {
				console.error(
					'[PROMETHEUS_SERVICE] Error collecting metrics:',
					error
				)
			}
		}

		setInterval(collectMetrics, this.updateInterval)
	}

	/**
	 * Добавляет устройство в мониторинг
	 * @param deviceId ID устройства
	 */
	public addDeviceToMonitoring(deviceId: string) {
		if (!this.dynamicMetricsCache.has(deviceId)) {
			this.dynamicMetricsCache.set(deviceId, {
				lastUpdate: 0,
				metrics: null,
				subscribers: 0
			})
		}
	}

	/**
	 * Удаляет устройство из мониторинга
	 * @param deviceId ID устройства
	 */
	public removeDeviceFromMonitoring(deviceId: string) {
		this.dynamicMetricsCache.delete(deviceId)
	}

	/**
	 * Формирует заголовок авторизации
	 * @returns Строка с заголовком Basic Auth
	 */
	private getAuthHeader(): string {
		if (!this.config.auth.username || !this.config.auth.password) {
			console.error('Missing auth credentials:', {
				username: !!this.config.auth.username,
				password: !!this.config.auth.password
			})
		}
		return `Basic ${Buffer.from(`${this.config.auth.username}:${this.config.auth.password}`).toString('base64')}`
	}

	/**
	 * Создает экземпляр парсера для указанного устройства
	 * @param ipAddress IP-адрес устройства
	 * @returns Экземпляр PrometheusParser
	 */
	private async getParser(ipAddress: string): Promise<PrometheusParser> {
		const response = await this.getMetricsByIp(ipAddress)
		return new PrometheusParser(response)
	}

	/**
	 * Перезагружает конфигурацию Prometheus
	 */
	public async reloadPrometheusConfig(): Promise<void> {
		try {
			this.log('info', `Reloading Prometheus configuration...`)
			const response = await fetch(
				`${this.config.url}/prometheus/-/reload`,
				{
					method: 'POST',
					headers: {
						Authorization: this.getAuthHeader(),
						'Content-Type': 'application/json'
					}
				}
			)
			if (!response.ok) {
				throw new Error(
					`Failed to reload prometheus config: ${response.statusText}`
				)
			}
			this.log('info', `Prometheus configuration reloaded successfully`)
		} catch (error) {
			throw new Error(`Failed to reload prometheus config: ${error}`)
		}
	}

	/**
	 * Получает статус агента Prometheus
	 * @param ipAddress IP-адрес устройства (опционально)
	 * @returns Статус агента или массив статусов
	 */
	async getAgentStatus(
		ipAddress?: string
	): Promise<AgentStatus | AgentStatus[]> {
		// if (process.env.NODE_ENV === 'development') {
		//     await new Promise(resolve => setTimeout(resolve, 500)); // Эмулируем задержку

		//     const mockStatus: AgentStatus = {
		//         health: 'up',
		//         lastError: '',
		//         lastScrape: new Date().toISOString(),
		//         lastScrapeDuration: 0.1,
		//         scrapeInterval: '15s',
		//         scrapeTimeout: '10s',
		//         up: true
		//     };
		//     if (!ipAddress) {
		//         return [mockStatus];
		//     }
		//     return mockStatus;
		// }

		try {
			const authHeader = this.getAuthHeader()
			const response = await fetch(
				`${this.config.url}/prometheus/api/v1/targets`,
				{
					headers: {
						Authorization: authHeader
					}
				}
			)
			if (!response.ok) {
				throw new Error(
					`Failed to fetch targets: ${response.statusText}`
				)
			}
			const data = await response.json()
			const activeTargets = data.data.activeTargets as Array<{
				health: string
				lastError: string
				lastScrape: string
				lastScrapeDuration: number
				scrapeInterval: string
				scrapeTimeout: string
				labels: { instance: string; [key: string]: string }
			}>

			if (!ipAddress) {
				return activeTargets.map(target => ({
					health: target.health,
					lastError: target.lastError || '',
					lastScrape: target.lastScrape,
					lastScrapeDuration: target.lastScrapeDuration,
					scrapeInterval: target.scrapeInterval,
					scrapeTimeout: target.scrapeTimeout,
					up: target.health === 'up'
				}))
			}
			const targetAgent = activeTargets.find(
				target => target.labels.instance === `${ipAddress}:9182`
			)

			if (!targetAgent) {
				return {
					health: 'unknown',
					lastError: 'Agent not found in Prometheus targets',
					lastScrape: '',
					lastScrapeDuration: 0,
					scrapeInterval: '',
					scrapeTimeout: '',
					up: false
				}
			}

			return {
				health: targetAgent.health,
				lastError: targetAgent.lastError || '',
				lastScrape: targetAgent.lastScrape,
				lastScrapeDuration: targetAgent.lastScrapeDuration,
				scrapeInterval: targetAgent.scrapeInterval,
				scrapeTimeout: targetAgent.scrapeTimeout,
				up: targetAgent.health === 'up'
			}
		} catch (error) {
			console.error(
				`[PROMETHEUS_SERVICE] Failed to get targets status:`,
				error
			)

			if (ipAddress) {
				return {
					health: 'error',
					lastError: `Failed to get agent status: ${error}`,
					lastScrape: '',
					lastScrapeDuration: 0,
					scrapeInterval: '',
					scrapeTimeout: '',
					up: false
				}
			}

			return []
		}
	}

	/**
	 * Ожидает доступности метрик для устройства
	 * @param ipAddress IP-адрес устройства
	 * @param maxAttempts Максимальное количество попыток
	 * @param delayMs Задержка между попытками в миллисекундах
	 * @returns true если метрики доступны, false если нет
	 */
	async waitForMetricsAvailability(
		ipAddress: string,
		maxAttempts = 10,
		delayMs = 2000
	): Promise<boolean> {
		this.log('info', `Waiting for metrics availability for ${ipAddress}...`)

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				this.log(
					'info',
					`Attempt ${attempt}/${maxAttempts} to get metrics for ${ipAddress}`
				)

				// Проверяем статус агента
				//const status = await this.getAgentStatus(ipAddress)

				// Пробуем получить метрики независимо от статуса агента
				try {
					// Раньше здесь не передавался тип — это ломало проверку доступности
					const response = await this.getMetricsByIp(
						ipAddress,
						MetricType.STATIC
					)
					if (
						response &&
						response.data &&
						response.data.result &&
						response.data.result.length > 0
					) {
						return true
					} else {
						this.log(
							'info',
							`No metrics available yet for ${ipAddress}`
						)
					}
				} catch (metricError) {
					this.log(
						'warn',
						`Error fetching metrics (attempt ${attempt}/${maxAttempts}):`,
						metricError
					)
				}

				// Ждем перед следующей попыткой

				await new Promise(resolve => setTimeout(resolve, delayMs))
			} catch (error) {
				this.log(
					'warn',
					`Error checking metrics availability (attempt ${attempt}/${maxAttempts}):`,
					error
				)
				// Продолжаем попытки даже при ошибке
				await new Promise(resolve => setTimeout(resolve, delayMs))
			}
		}

		this.log(
			'warn',
			`Failed to get metrics after ${maxAttempts} attempts for ${ipAddress}`
		)
		return false
	}

	/**
	 * Получает метрики от Prometheus для указанного IP адреса
	 * @param ipAddress IP адрес устройства
	 * @param type Тип запрашиваемых метрик
	 * @param specificMetrics Конкретные метрики (опционально)
	 */
	async getMetricsByIp(
		ipAddress: string,
		type?: MetricType,
		specificMetrics?: string[]
	): Promise<PrometheusApiResponse> {
		const startTime = Date.now()
		this.log(
			'info',
			`[METRICS_FETCH] Starting metrics fetch for ${ipAddress}`,
			{
				type,
				specificMetrics: specificMetrics?.length || 0
			}
		)

		try {
			// Определяем какие метрики запрашивать
			let metricsToQuery: string[] = []

			if (specificMetrics?.length) {
				// Если переданы конкретные метрики, используем их
				metricsToQuery = specificMetrics
			} else if (type) {
				// Если указан тип - получаем метрики из конфига
				if (type === MetricType.STATIC) {
					metricsToQuery = [
						...PROMETHEUS_METRICS[MetricType.STATIC].system,
						...PROMETHEUS_METRICS[MetricType.STATIC].hardware
					]
				} else if (type === MetricType.DYNAMIC) {
					metricsToQuery = [
						...PROMETHEUS_METRICS[MetricType.DYNAMIC].cpu,
						...PROMETHEUS_METRICS[MetricType.DYNAMIC].memory,
						...PROMETHEUS_METRICS[MetricType.DYNAMIC].disk,
						...PROMETHEUS_METRICS[MetricType.DYNAMIC].network
					]
				} else if (type === MetricType.PROCESS) {
					metricsToQuery = [
						...PROMETHEUS_METRICS[MetricType.PROCESS].process
					]
				}
			} else {
				throw new Error(
					'Either type or specificMetrics must be provided'
				)
			}

			if (!metricsToQuery.length) {
				throw new Error(`No metrics found for type: ${type}`)
			}

			// Формируем запрос к Prometheus
			const query = `{instance="${ipAddress}:9182",__name__=~"${metricsToQuery.join('|')}"}`
			this.log(
				'info',
				`[METRICS_FETCH] Query prepared with ${metricsToQuery.length} metrics`
			)

			// Создаем URL для запроса
			const url = new URL('/prometheus/api/v1/query', this.config.url)
			url.searchParams.append('query', query)

			this.log(
				'info',
				`[METRICS_FETCH] Query prepared for ${ipAddress}: ${query}`
			)
			const fetchStartTime = Date.now()

			// Выполняем запрос
			this.log(
				'info',
				`[METRICS_FETCH] Sending request to ${url.toString()}`
			)

			const response = await fetch(url.toString(), {
				headers: {
					Authorization: this.getAuthHeader(),
					Accept: 'application/json'
				}
			})

			const fetchTime = Date.now() - fetchStartTime
			this.log(
				'info',
				`[METRICS_FETCH] Response received in ${fetchTime}ms`
			)

			if (!response.ok) {
				throw new Error(
					`HTTP error! status: ${response.status}, statusText: ${response.statusText}`
				)
			}

			const responseTime = Date.now() - fetchStartTime
			this.log(
				'info',
				`[METRICS_FETCH] Response received in ${responseTime}ms`
			)

			const parseStartTime = Date.now()
			const data = await response.json()
			const parseTime = Date.now() - parseStartTime

			const dataSize = JSON.stringify(data).length / 1024 // размер в КБ
			const totalTime = Date.now() - startTime
			const metricsCount = data.data?.result?.length || 0

			this.log(
				'info',
				`[METRICS_FETCH] Metrics data processed for ${ipAddress}:`,
				{
					type,
					fetchTimeMs: fetchTime,
					parseTimeMs: parseTime,
					totalTimeMs: totalTime,
					dataSizeKb: Math.round(dataSize),
					metricsCount,
					metricsPerSecond: Math.round(
						(metricsCount / totalTime) * 1000
					)
				}
			)

			if (metricsCount === 0) {
				this.log(
					'warn',
					`[METRICS_FETCH] No metrics found for ${ipAddress} with type ${type}`
				)
			}

			return data
		} catch (error) {
			this.log('error', `Error fetching metrics for ${ipAddress}:`, error)
			throw error
		}
	}

	/**
	 * Получает метрики с временным диапазоном
	 * @param ipAddress IP-адрес устройства
	 * @param metricName Имя метрики
	 * @param range Диапазон времени (например, "5m" для 5 минут)
	 * @param step Шаг для точек данных (например, "30s" для 30 секунд)
	 * @param additionalLabels Дополнительные лейблы для запроса
	 * @returns Ответ Prometheus API с временным рядом
	 */
	async getMetricsRange(
		ipAddress: string,
		metricName: string,
		range: string = '15m',
		step: string = '15s',
		additionalLabels: Record<string, string> = {}
	): Promise<PrometheusApiResponse> {
		try {
			const authHeader = this.getAuthHeader()
			const end = Math.floor(Date.now() / 1000)
			const start = end - this.parseTimeRange(range)

			// Формируем лейблы для запроса
			const labels = {
				name: metricName, // Используем name вместо __name__
				instance: `${ipAddress}:9182`,
				...additionalLabels
			}
			const labelString = Object.entries(labels)
				.map(([key, value]) => `${key}="${value}"`)
				.join(',')

			// Создаем PromQL запрос
			const query = encodeURIComponent(`{${labelString}}`)

			const url =
				`${this.config.url}/prometheus/api/v1/query_range?` +
				`query=${query}&start=${start}&end=${end}&step=${this.parseTimeRange(step)}`

			const response = await fetch(url, {
				headers: {
					Authorization: authHeader
				}
			})

			if (!response.ok) {
				throw new Error(
					`Failed to fetch metrics range: ${response.statusText}`
				)
			}

			const data = await response.json()

			if (data.data.result.length === 0) {
				this.log('warn', `No data found for query:`, {
					metric: metricName,
					labels: labels,
					timeRange: {
						start: new Date(start * 1000).toISOString(),
						end: new Date(end * 1000).toISOString()
					}
				})
			}

			return data
		} catch (error) {
			this.log(
				'error',
				`Error getting metrics range for ${ipAddress}:`,
				error
			)
			throw new Error(`Failed to get metrics range: ${error}`)
		}
	}

	/**
	 * Преобразует строку временного диапазона в секунды
	 * @param timeStr Строка времени (например, "5m", "30s")
	 * @returns Количество секунд
	 */
	private parseTimeRange(timeStr: string): number {
		const value = parseInt(timeStr)
		const unit = timeStr.slice(-1)
		switch (unit) {
			case 's':
				return value
			case 'm':
				return value * 60
			case 'h':
				return value * 3600
			case 'd':
				return value * 86400
			default:
				throw new Error(`Unknown time unit: ${unit}`)
		}
	}

	/**
	 * Получает системную информацию устройства
	 * @param ipAddress IP-адрес устройства
	 * @returns Системная информация
	 */
	async getSystemInfo(ipAddress: string) {
		try {
			const parser = await this.getParser(ipAddress)
			const info = await parser.getSystemInfo()

			return info
		} catch (error) {
			this.log('error', `Failed to get system info:`, error)
			throw error
		}
	}

	/**
	 * Получает информацию об аппаратном обеспечении
	 * @param ipAddress IP-адрес устройства
	 * @returns Информация об аппаратном обеспечении
	 */
	async getHardwareInfo(ipAddress: string) {
		try {
			const parser = await this.getParser(ipAddress)
			const info = await parser.getHardwareInfo()

			return info
		} catch (error) {
			console.error(
				`[PROMETHEUS_SERVICE] Failed to get system info:`,
				error
			)
			throw error
		}
	}

	/**
	 * Получает метрики процессора
	 * @param ipAddress IP-адрес устройства
	 * @returns Метрики процессора
	 */
	async getProcessorMetrics(ipAddress: string) {
		const parser = await this.getParser(ipAddress)
		return parser.getProcessorMetrics()
	}

	/**
	 * Получает метрики сети
	 * @param ipAddress IP-адрес устройства
	 * @returns Метрики сети
	 */
	async getNetworkMetrics(ipAddress: string) {
		const parser = await this.getParser(ipAddress)
		return parser.getNetworkMetrics()
	}

	/**
	 * Получает метрики дисков
	 * @param ipAddress IP-адрес устройства
	 * @returns Метрики дисков
	 */
	async getDiskMetrics(ipAddress: string) {
		const parser = await this.getParser(ipAddress)
		return parser.getDiskMetrics()
	}

	/**
	 * Получает список процессов
	 * @param ipAddress IP-адрес устройства
	 * @returns Список процессов
	 */
	async getProcessList(ipAddress: string) {
		const parser = await this.getParser(ipAddress)
		return parser.getProcessList()
	}

	/**
	 * Получает временные ряды метрик за период, с подсказкой оптимального шага.
	 *
	 * @param ipAddress IP‑адрес устройства
	 * @param metricName Имя метрики
	 * @param timeRange Параметры диапазона (`{ range: '5m' }`)
	 * @param additionalLabels Дополнительные лейблы для селектора
	 * @returns Массив временных рядов, готовых к визуализации
	 */
	async getMetricsTimeSeries(
		ipAddress: string,
		metricName: string,
		timeRange: TimeRangeParams = { range: '5m' },
		additionalLabels: Record<string, string> = {}
	): Promise<MetricTimeSeries[]> {
		try {
			// Определяем временной диапазон
			const end = timeRange.end || Math.floor(Date.now() / 1000)
			const start =
				timeRange.start ||
				(timeRange.range
					? end - this.parseTimeRange(timeRange.range)
					: end - 5 * 60) // по умолчанию 5 минут
			const step = timeRange.step || this.calculateOptimalStep(start, end)

			// Формируем лейблы для запроса
			const labels = {
				instance: `${ipAddress}:9182`,
				...additionalLabels
			}
			const labelString = Object.entries(labels)
				.map(([key, value]) => `${key}="${value}"`)
				.join(',')

			// Создаем PromQL запрос
			const query = encodeURIComponent(`${metricName}{${labelString}}`)
			const url =
				`${this.config.url}/prometheus/api/v1/query_range?` +
				`query=${query}&start=${start}&end=${end}&step=${step}`

			this.log('info', `Fetching metrics time series:`, {
				metric: metricName,
				labels,
				timeRange: {
					start: new Date(start * 1000).toISOString(),
					end: new Date(end * 1000).toISOString(),
					step
				}
			})

			const response = await fetch(url, {
				headers: {
					Authorization: this.getAuthHeader()
				}
			})

			if (!response.ok) {
				throw new Error(
					`Failed to fetch metrics time series: ${response.statusText}`
				)
			}

			const data: PrometheusApiResponse = await response.json()

			if (data.status !== 'success') {
				throw new Error(
					`Prometheus API error: ${data.error || 'Unknown error'}`
				)
			}

			return data.data.result.map(series => ({
				metric: {
					name: series.metric.__name__, // Используем __name__ как name
					instance: series.metric.instance,
					job: series.metric.job,
					...Object.entries(series.metric)
						.filter(
							([key]) =>
								!['__name__', 'instance', 'job'].includes(key)
						)
						.reduce(
							(acc, [key, value]) => ({ ...acc, [key]: value }),
							{}
						)
				},
				values:
					series.values?.map(([timestamp, value]) => ({
						timestamp: Number(timestamp),
						value: parseFloat(value)
					})) || []
			}))
		} catch (error) {
			this.log(
				'error',
				`Error getting metrics time series for ${ipAddress}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Вычисляет оптимальный шаг выборки на основе длительности периода.
	 * Балансирует точность и объем данных.
	 * @param start Начало периода (Unix‑timestamp, мс)
	 * @param end Конец периода (Unix‑timestamp, мс)
	 * @returns Строка шага (например, `'15s'`)
	 * @private
	 */
	private calculateOptimalStep(start: number, end: number): string {
		const duration = end - start

		// Подбираем оптимальный шаг в зависимости от длительности
		if (duration <= 300) return '15s' // до 5 минут
		if (duration <= 900) return '30s' // до 15 минут
		if (duration <= 3600) return '1m' // до 1 часа
		if (duration <= 14400) return '5m' // до 4 часов
		if (duration <= 86400) return '15m' // до 24 часов
		return '1h' // более 24 часов
	}

	/**
	 * Получает последние значения метрик за короткий период (по умолчанию `'5m'`).
	 * @param ipAddress IP‑адрес устройства
	 * @param metricName Имя метрики
	 * @param range Диапазон (например, `'5m'`)
	 * @param additionalLabels Дополнительные лейблы для селектора
	 * @returns Массив последних точек временных рядов
	 */
	async getLastMetrics(
		ipAddress: string,
		metricName: string,
		range: TimeRange = '5m',
		additionalLabels: Record<string, string> = {}
	): Promise<MetricTimeSeries[]> {
		return this.getMetricsTimeSeries(
			ipAddress,
			metricName,
			{ range },
			additionalLabels
		)
	}
}
