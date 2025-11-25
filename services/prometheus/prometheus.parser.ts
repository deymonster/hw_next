import { LoggerService, LogLevel } from '../logger/logger.interface'
import { Logger } from '../logger/logger.service'
import {
	ActiveProcessMemoryUsage,
	BiosInfo,
	CpuTemperature,
	CpuUsagePercent,
	DiskHealthStatus,
	DiskMetrics,
	GpuInfo,
	GpuTypeInfo,
	MemoryMetrics,
	MemoryModuleInfo,
	MotherBoardInfo,
	NetworkStatus,
	ProcessCpuUsagePercent,
	ProcessGroupCpuUsage,
	ProcessGroupMemoryPrivate,
	ProcessGroupMemoryWorkingSet,
	ProcessInfo,
	ProcessInstanceCount,
	ProcessListInfo,
	PrometheusApiResponse,
	SerialNumber,
	SystemInformation,
	UUIDMetric
} from './prometheus.interfaces'

/**
 * Класс для парсинга метрик из Prometheus API
 * Обеспечивает:
 * - Поиск метрик по имени
 * - Преобразование сырых данных в типизированные объекты
 * - Вычисление агрегированных значений
 * - Форматирование значений (байты в ГБ/МБ)
 */
export class PrometheusParser {
	private readonly response: PrometheusApiResponse
	private readonly logger = Logger.getInstance()

	constructor(response: PrometheusApiResponse) {
		this.response = response
	}

	private async log(level: keyof LogLevel, message: string, ...args: any[]) {
		await this.logger.log(
			LoggerService.PROMETHEUS_PARSER,
			level,
			message,
			...args
		)
	}

	/**
	 * Находит первую метрику с указанным именем
	 * @param name Имя метрики
	 * @returns Метрика указанного типа или undefined
	 */
	private async findMetric<T>(name: string): Promise<T | undefined> {
		const startTime = Date.now()

		if (!this.response?.data?.result) {
			await this.log('warn', `No data in response for metric ${name}`)
			return undefined
		}

		const result = this.response.data.result.find(item => {
			const metricName = item.metric.__name__ || item.metric.name
			return metricName === name
		})

		if (!result) {
			await this.log('debug', `Metric ${name} not found`)
			return undefined
		}

		const endTime = Date.now()
		await this.log(
			'debug',
			`Found metric ${name} in ${endTime - startTime}ms`
		)
		return result.metric as T
	}

	private _metricsCache: Map<string, any[]> = new Map()

	/**
	 * Находит все метрики с указанным именем
	 * @param name Имя метрики
	 * @returns Массив метрик указанного типа
	 */
	private async findMetrics<T>(name: string): Promise<T[]> {
		const startTime = Date.now()

		if (!this.response?.data?.result) {
			await this.log('warn', '[PROMETHEUS_PARSER] No data in response')
			return []
		}

		if (this._metricsCache.has(name)) {
			return this._metricsCache.get(name) as T[]
		}

		const results = this.response.data.result.filter(item => {
			const metricName = item.metric.__name__ || item.metric.name
			return metricName === name
		})

		const mappedResults = results.map(item => ({
			...(item.metric as unknown as T),
			value: Number(item.value?.[1] || 0)
		})) as T[]

		// Кэшируем результат
		this._metricsCache.set(name, mappedResults)

		const endTime = Date.now()
		await this.log(
			'debug',
			`[PROMETHEUS_PARSER] Found ${mappedResults.length} metrics for ${name} in ${endTime - startTime}ms`
		)

		return mappedResults
	}

	/**
	 * Получает числовое значение метрики с учетом лейблов
	 * @param name Имя метрики
	 * @param labels Лейблы для фильтрации
	 * @returns Числовое значение метрики
	 */
	private async getMetricValue(
		name: string,
		labels: Record<string, string> = {}
	): Promise<number> {
		const startTime = Date.now()

		if (!this.response?.data?.result) {
			await this.log('warn', `No data in response for ${name}`)
			return 0
		}

		// Ищем метрику, которая соответствует имени и всем переданным лейблам
		const result = this.response.data.result.find(item => {
			// Проверяем имя метрики
			if (item.metric.__name__ !== name) {
				return false
			}

			// Проверяем все переданные лейблы
			const labelsMatch = Object.entries(labels).every(([key, value]) => {
				const metricValue = item.metric[key]
				const matches = metricValue === value
				return matches
			})
			return labelsMatch
		})

		if (!result) {
			return 0
		}

		const value = result.value?.[1]

		if (!value) {
			await this.log('warn', `No value found for metric ${name}`)
			return 0
		}

		const endTime = Date.now()
		if (endTime - startTime > 250) {
			// Логируем только если операция заняла больше 100мс
			await this.log(
				'warn',
				`Slow metric value retrieval for ${name}: ${endTime - startTime}ms`
			)
		}
		return Number(value)
	}

	/**
	 * Конвертирует байты в гигабайты
	 * @param bytes Количество байт
	 * @returns Количество гигабайт с округлением до 2 знаков
	 */
	private bytesToGB(bytes: number): number {
		return Number((bytes / (1024 * 1024 * 1024)).toFixed(2))
	}

	/**
	 * Конвертирует байты в мегабайты
	 * @param bytes Количество байт
	 * @returns Количество мегабайт с округлением до 2 знаков
	 */
	private bytesToMB(bytes: number): number {
		return Number((bytes / (1024 * 1024)).toFixed(2))
	}

	/**
	 * Конвертирует байты в секунду в читаемый формат
	 * @param bytesPerSecond Скорость в байтах в секунду
	 * @returns Объект с значением и единицей измерения
	 */
	private formatBytesPerSecond(bytesPerSecond: number): {
		value: number
		unit: string
	} {
		if (bytesPerSecond >= 1024 * 1024 * 1024) {
			return {
				value: Number(
					(bytesPerSecond / (1024 * 1024 * 1024)).toFixed(2)
				),
				unit: 'Gb/s'
			}
		}
		if (bytesPerSecond >= 1024 * 1024) {
			return {
				value: Number((bytesPerSecond / (1024 * 1024)).toFixed(2)),
				unit: 'Mb/s'
			}
		}
		if (bytesPerSecond >= 1024) {
			return {
				value: Number((bytesPerSecond / 1024).toFixed(2)),
				unit: 'Kb/s'
			}
		}
		return { value: Number(bytesPerSecond.toFixed(2)), unit: 'B/s' }
	}

	/**
	 * Получает системную информацию
	 * @returns Объект с системной информацией
	 */
	public async getSystemInfo() {
		await this.log('info', 'Starting to parse system info')

		const systemInfo =
			await this.findMetric<SystemInformation>('system_information')
		this.log('info', 'SystemInfo', systemInfo)
		const uuid = await this.findMetric<UUIDMetric>('UNIQUE_ID_SYSTEM')
		const serialNumber = await this.findMetric<SerialNumber>(
			'device_serial_number_info'
		)

		return {
			uuid: uuid?.uuid,
			manufacturer: systemInfo?.manufacturer,
			model: systemInfo?.model,
			name: systemInfo?.name,
			osArchitecture: systemInfo?.os_architecture,
			osVersion: systemInfo?.os_version,
			deviceTag: serialNumber?.device_tag,
			location: serialNumber?.location,
			serialNumber: serialNumber?.serial_number
		}
	}

	/**
	 * Получает информацию об аппаратном обеспечении
	 * Включает:
	 * - Информацию о CPU (модель)
	 * - Информацию о материнской плате
	 * - Информацию о BIOS
	 * - Информацию о памяти (модули и использование)
	 * - Информацию о дисках (модель, тип, размер, здоровье, использование)
	 * - Информацию о GPU (имя, память)
	 * - Информацию о сетевых интерфейсах (имя, статус)
	 * @returns Объект с информацией о железе
	 */
	public async getHardwareInfo() {
		const bios = await this.findMetric<BiosInfo>('bios_info')
		const motherboard =
			await this.findMetric<MotherBoardInfo>('motherboard_info')
		const memoryModules =
			await this.findMetrics<MemoryModuleInfo>('memory_module_info')
		const gpus = await this.findMetrics<GpuInfo>('gpu_info')
		const gpuTypes = await this.findMetrics<GpuTypeInfo>('gpu_type_info')
		const disks =
			await this.findMetrics<DiskHealthStatus>('disk_health_status')
		const cpuInfo =
			await this.findMetric<CpuUsagePercent>('cpu_usage_percent')
		const networkInterfaces =
			await this.findMetrics<NetworkStatus>('network_status')

		const gpuInfo = await Promise.all(
			gpus.map(async gpu => {
				const name = gpu.name
				const gpuType = gpuTypes.find(type => type.name === name)?.type
				const memoryBytes = await this.getMetricValue(
					'gpu_memory_bytes',
					{ name }
				)

				const memoryMB = this.bytesToMB(memoryBytes)
				const memoryGB = Number((memoryMB / 1024).toFixed(2))

				return {
					name,
					memoryMB,
					memoryGB: Number.isFinite(memoryGB) ? memoryGB : undefined,
					type: gpuType
				}
			})
		)

		const networkInfo = await Promise.all(
			networkInterfaces.map(async iface => {
				const labels = { interface: iface.interface }
				const statusMetric = await this.getMetricValue(
					'network_status',
					labels
				)
				const rxBytes = await this.getMetricValue(
					'network_rx_bytes_per_second',
					labels
				)
				const txBytes = await this.getMetricValue(
					'network_tx_bytes_per_second',
					labels
				)

				const rx = this.formatBytesPerSecond(rxBytes)
				const tx = this.formatBytesPerSecond(txBytes)

				return {
					name: iface.interface,
					status: statusMetric === 1 ? 'up' : 'down',
					performance: {
						rx: { value: rx.value, unit: rx.unit },
						tx: { value: tx.value, unit: tx.unit }
					},
					errors: await this.getMetricValue('network_errors', labels),
					droppedPackets: await this.getMetricValue(
						'network_dropped_packets',
						labels
					)
				}
			})
		)

		return {
			cpu: {
				model: cpuInfo?.processor
			},
			motherboard: {
				manufacturer: motherboard?.manufacturer,
				product: motherboard?.product,
				serialNumber: motherboard?.serial_number,
				version: motherboard?.version
			},
			bios: {
				manufacturer: bios?.manufacturer,
				version: bios?.version,
				date: bios?.release_date
			},
			memory: {
				modules: memoryModules.map(module => ({
					capacity: module.capacity,
					manufacturer: module.manufacturer,
					partNumber: module.part_number,
					serialNumber: module.serial_number,
					speed: module.speed,
					type: (module as unknown as { type?: string }).type
				}))
			},
			disks: disks.map(disk => {
				const identifier = disk.disk || 'Unknown'
				return {
					id: identifier,
					model: identifier,
					type: disk.type || 'Unknown',
					size: disk.size || '0',
					health: disk.status || 'Unknown'
				}
			}),
			gpus: gpuInfo,
			networkInterfaces: networkInfo
		}
	}

	/**
	 * Получает метрики процессора
	 * Включает:
	 * - Модель процессора
	 * - Процент использования CPU
	 * - Температуру процессора (все сенсоры и среднее значение)
	 * @returns Объект с метриками процессора
	 */
	public async getProcessorMetrics() {
		// Получаем базовую информацию о процессоре
		const cpuInfo =
			await this.findMetric<CpuUsagePercent>('cpu_usage_percent')

		// Получаем все температурные сенсоры
		const cpuTemperatures =
			await this.findMetrics<CpuTemperature>('cpu_temperature')

		// Получаем все значения температуры
		const temperatures = await Promise.all(
			cpuTemperatures.map(async sensor => {
				const value = await this.getMetricValue('cpu_temperature', {
					sensor: sensor.sensor
				})
				return {
					name: sensor.sensor,
					value: Number(value.toFixed(2))
				}
			})
		)

		// Вычисляем среднюю температуру
		const averageTemp =
			temperatures.length > 0
				? Number(
						(
							temperatures.reduce(
								(sum, sensor) => sum + sensor.value,
								0
							) / temperatures.length
						).toFixed(2)
					)
				: 0

		// Извлекаем количество логических ядер из метрики
		let logicalCores = 0
		if (cpuInfo && cpuInfo.logical_cores) {
			logicalCores = parseInt(cpuInfo.logical_cores, 10) || 0
		}

		return {
			model: cpuInfo?.processor || '', // Модель процессора с fallback
			usage: Math.round(await this.getMetricValue('cpu_usage_percent')), // Округленный процент использования
			cores: logicalCores,
			temperature: {
				sensors: temperatures, // Все сенсоры с их значениями
				average: averageTemp // Средняя температура
			}
		}
	}

	/**
	 * Получает метрики сети
	 * Для каждого интерфейса включает:
	 * - Имя интерфейса
	 * - Статус (up/down)
	 * - Производительность (rx/tx в ГБ/с)
	 * - Количество ошибок
	 * - Количество потерянных пакетов
	 * @returns Массив объектов с метриками сетевых интерфейсов
	 */
	public async getNetworkMetrics() {
		const networkInterfaces =
			await this.findMetrics<NetworkStatus>('network_status')

		const results = await Promise.all(
			networkInterfaces.map(async iface => {
				const labels = { interface: iface.interface }
				const status = await this.getMetricValue(
					'network_status',
					labels
				)

				const rxBytes = await this.getMetricValue(
					'network_rx_bytes_per_second',
					labels
				)
				const txBytes = await this.getMetricValue(
					'network_tx_bytes_per_second',
					labels
				)

				const rx = this.formatBytesPerSecond(rxBytes)
				const tx = this.formatBytesPerSecond(txBytes)

				return {
					name: iface.interface,
					status: status === 1 ? 'up' : 'down',
					performance: {
						rx: { value: rx.value, unit: rx.unit },
						tx: { value: tx.value, unit: tx.unit }
					},
					errors: await this.getMetricValue('network_errors', labels),
					droppedPackets: await this.getMetricValue(
						'network_dropped_packets',
						labels
					)
				}
			})
		)

		return results
	}

	/**
	 * Получает метрики дисков
	 * @returns {DiskMetrics[]} Массив метрик для каждого диска
	 */
	public async getDiskMetrics(): Promise<DiskMetrics[]> {
		// Получаем базовую информацию о дисках
		const disks =
			await this.findMetrics<DiskHealthStatus>('disk_health_status')

		const diskUsageMetrics = this.response.data.result
			.filter(item => item.metric.__name__ === 'disk_usage_bytes')
			.map(item => ({
				letter: item.metric.disk,
				type: item.metric.type,
				value: item.value?.[1] || '0'
			}))
		const diskLetters = [
			...new Set(
				diskUsageMetrics
					.filter(m => m.type === 'total')
					.map(m => m.letter)
			)
		]

		const results = await Promise.all(
			diskLetters.map(async letter => {
				const diskName = letter || 'unknown'
				const labels = { disk: diskName }

				const total = await this.getMetricValue('disk_usage_bytes', {
					...labels,
					type: 'total'
				})
				const used = await this.getMetricValue('disk_usage_bytes', {
					...labels,
					type: 'used'
				})
				const free = total - used
				const percent = await this.getMetricValue(
					'disk_usage_percent',
					labels
				)

				const readSpeed = await this.getMetricValue(
					'disk_read_bytes_per_second',
					labels
				)
				const writeSpeed = await this.getMetricValue(
					'disk_write_bytes_per_second',
					labels
				)

				const read = this.formatBytesPerSecond(readSpeed)
				const write = this.formatBytesPerSecond(writeSpeed)

				const healthInfo = disks.find(d => d.disk === diskName)
				return {
					disk: healthInfo?.disk || letter || 'Unknown',
					usage: {
						total: this.bytesToGB(total),
						used: this.bytesToGB(used),
						free: this.bytesToGB(free),
						percent: Number(percent.toFixed(2))
					},
					performance: {
						read: { value: read.value, unit: read.unit },
						write: { value: write.value, unit: write.unit }
					}
				}
			})
		)

		return results
	}

	/**
	 * Получает список процессов
	 * @returns Информация о процессах: общее количество и топ-5 по использованию CPU
	 */
	public async getProcessList(): Promise<ProcessListInfo> {
		const totalProcesses = Math.round(
			await this.getMetricValue('active_proccess_list')
		)
		const processMemoryMetrics =
			await this.findMetrics<ActiveProcessMemoryUsage>(
				'active_proccess_memory_usage'
			)
		const processCpuMetrics =
			await this.findMetrics<ProcessCpuUsagePercent>(
				'proccess_cpu_usage_percent'
			)

		const instanceCountMetrics =
			await this.findMetrics<ProcessInstanceCount>(
				'process_instance_count'
			)
		const workingSetMetrics =
			await this.findMetrics<ProcessGroupMemoryWorkingSet>(
				'process_group_memory_workingset_mb'
			)
		const privateMemoryMetrics =
			await this.findMetrics<ProcessGroupMemoryPrivate>(
				'process_group_memory_private_mb'
			)
		const groupCpuMetrics = await this.findMetrics<ProcessGroupCpuUsage>(
			'process_group_cpu_usage_percent'
		)

		if (!processMemoryMetrics.length || !processCpuMetrics.length) {
			await this.log('warn', 'No process metrics found')
			return {
				total: totalProcesses,
				processes: []
			}
		}

		// Создаем Map для быстрого поиска CPU метрик по PID
		// const cpuByPid = new Map();
		// await Promise.all(processCpuMetrics.map(async metric => {
		//     const value = await this.getMetricValue('proccess_cpu_usage_percent', {
		//         pid: metric.pid,
		//         process: metric.process
		//     });
		//     cpuByPid.set(metric.pid, value);
		// }));

		// // Создаем Map для группировки процессов по имени
		// const processGroups = new Map<string, {
		//     name: string;
		//     totalCpu: number;
		//     totalMemory: number;
		//     pids: Set<string>;
		// }>();

		// // Формируем список процессов и группируем их
		// for (const proc of processMemoryMetrics.filter(proc => proc.pid && proc.process)) {
		//     // Используем значение памяти из текущего элемента 'proc'
		//     const memory = proc.value;
		//     const cpu = cpuByPid.get(proc.pid) || 0;

		//     // Группируем процессы по имени
		//     if (!processGroups.has(proc.process)) {
		//         processGroups.set(proc.process, {
		//             name: proc.process,
		//             totalCpu: cpu,
		//             totalMemory: memory,
		//             pids: new Set([proc.pid])
		//         });
		//     } else {
		//         const group = processGroups.get(proc.process)!;
		//         group.totalCpu += cpu;
		//         group.totalMemory += memory;
		//         group.pids.add(proc.pid);
		//     }
		// }

		// // Преобразуем сгруппированные процессы в массив
		// const groupedProcesses = Array.from(processGroups.values()).map(group => ({
		//     name: group.name,
		//     instances: group.pids.size,
		//     memory: group.totalMemory,
		//     cpu: Number(group.totalCpu.toFixed(1)) // CPU уже в процентах
		// }));

		// // Сортируем процессы по использованию CPU
		// groupedProcesses.sort((a, b) => b.cpu - a.cpu);

		// Создаем Map для группировки процессов
		const processGroups = new Map<string, ProcessInfo>()

		// Обрабатываем количество экземпляров
		for (const metric of instanceCountMetrics) {
			const processName = metric.process
			const instanceCount = await this.getMetricValue(
				'process_instance_count',
				{ process: processName }
			)
			processGroups.set(processName, {
				name: processName,
				instances: Number(instanceCount),
				metrics: {
					cpu: 0,
					memory: {
						workingSet: 0,
						private: 0
					}
				}
			})
		}

		// Добавляем метрики WorkingSet памяти
		for (const metric of workingSetMetrics) {
			const process = processGroups.get(metric.process)
			if (process) {
				const workingSetMemory = await this.getMetricValue(
					'process_group_memory_workingset_mb',
					{
						process: metric.process
					}
				)
				process.metrics.memory.workingSet = workingSetMemory
			}
		}

		// Добавляем метрики Private памяти
		for (const metric of privateMemoryMetrics) {
			const process = processGroups.get(metric.process)
			if (process) {
				const privateMemory = await this.getMetricValue(
					'process_group_memory_private_mb',
					{
						process: metric.process
					}
				)
				process.metrics.memory.private = privateMemory
			}
		}

		// Добавляем метрики CPU
		for (const metric of groupCpuMetrics) {
			const process = processGroups.get(metric.process)
			if (process) {
				const cpuValue = await this.getMetricValue(
					'process_group_cpu_usage_percent',
					{
						process: metric.process
					}
				)
				process.metrics.cpu = cpuValue
			}
		}

		// Преобразуем Map в массив и сортируем по использованию CPU
		const processes = Array.from(processGroups.values()).sort(
			(a, b) => b.metrics.cpu - a.metrics.cpu
		)
		// В конце метода getProcessList()
		return {
			total: processes?.length || 0,
			processes: processes || []
		}
	}

	/**
	 * Парсит временной ряд метрик
	 * @param metricName Имя метрики
	 * @returns Массив точек [timestamp, value]
	 * @throws Error если ответ не является временным рядом
	 */
	parseTimeSeriesData(metricName: string): Array<[number, number]> {
		if (
			!this.response?.data?.resultType ||
			this.response.data.resultType !== 'matrix'
		) {
			throw new Error('Response is not a time series (matrix)')
		}

		const result = this.response.data.result.find(
			item =>
				item.metric.__name__ === metricName ||
				item.metric.name === metricName
		)

		if (!result?.values?.length) {
			this.log(
				'warn',
				`No time series data found for metric: ${metricName}`
			)
			return []
		}

		return result.values.map(([timestamp, value]) => [
			Number(timestamp),
			Number(value)
		])
	}

	/**
	 * Получает последнее значение из временного ряда
	 * @param metricName Имя метрики
	 * @returns Последнее значение или null если данных нет
	 */
	getLastValueFromTimeSeries(metricName: string): number | null {
		try {
			const timeSeries = this.parseTimeSeriesData(metricName)
			if (timeSeries.length === 0) {
				return null
			}
			return timeSeries[timeSeries.length - 1][1]
		} catch (error) {
			this.log(
				'error',
				`Error getting last value from time series: ${error}`
			)
			return null
		}
	}

	/**
	 * Получает метрики памяти
	 * @returns {MemoryMetrics} Информация об использовании памяти
	 */
	public async getMemoryMetrics(): Promise<MemoryMetrics> {
		// Получаем метрики из Prometheus
		const total = await this.getMetricValue('total_memory_bytes')
		const used = await this.getMetricValue('used_memory_bytes')
		const free = await this.getMetricValue('free_memory_bytes')

		// Вычисляем процент использования
		const percent = total ? (used / total) * 100 : 0

		// Конвертируем байты в гигабайты для отображения
		return {
			total: this.bytesToMB(total),
			used: this.bytesToMB(used),
			free: this.bytesToMB(free),
			percent: Number(percent.toFixed(2))
		}
	}
}
