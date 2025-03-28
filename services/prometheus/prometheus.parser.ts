import { 
    PrometheusApiResponse, 
    PrometheusMetricResult,
    SystemInformation,
    UUIDMetric,
    SerialNumber,
    BiosInfo,
    MotherBoardInfo,
    MemoryInfo,
    GpuInfo,
    CpuUsagePercent,
    CpuTemperature,
    DiskHealthStatus,
    NetworkStatus,
    ActiveProcessMemoryUsage,
    ProcessCpuUsagePercent,
    NetworkRXPerSecond,
    NetworkTXPerSecond,
    NetworkErrors,
    NetworkDroppedPackets,
    DiskReadBytesPerSecond,
    DiskWriteBytesPerSecond,
    DiskUsageBytes,
    DiskUsagePercent,
    TotalMemoryBytes,
    UsedMemoryBytes,
    FreeMemoryBytes,
    GpuMemoryBytes,
    ProcessListInfo,
    ProcessInfo,
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
    private readonly response: PrometheusApiResponse;

    constructor(response: PrometheusApiResponse) {
        this.response = response;
    }

    /**
     * Находит первую метрику с указанным именем
     * @param name Имя метрики
     * @returns Метрика указанного типа или undefined
     */
    private findMetric<T>(name: string): T | undefined {
        this.log('info', `Finding metric: ${name}`);
        if (!this.response?.data?.result) {
            this.log('warn', 'No data in response');
            return undefined;
        }

        const result = this.response.data.result.find(item => {
            const metricName = item.metric.__name__ || item.metric.name;
            this.log('info', `Comparing ${metricName} with ${name}`);
            return metricName === name;
        });

        if (!result) {
            this.log('warn', `Metric ${name} not found`);
            return undefined;
        }

        this.log('info', `Found metric ${name}:`, result);
        return result.metric as T;
    }

    /**
     * Находит все метрики с указанным именем
     * @param name Имя метрики
     * @returns Массив метрик указанного типа
     */
    private findMetrics<T>(name: string): T[] {
        this.log('info', `Finding metrics: ${name}`);
        if (!this.response?.data?.result) {
            this.log('warn', 'No data in response');
            return [];
        }

        const results = this.response.data.result.filter(item => {
            const metricName = item.metric.__name__ || item.metric.name;
            return metricName === name;
        });

        this.log('info', `Found ${results.length} metrics for ${name}`);
        return results.map(item => item.metric as T);
    }

    /**
     * Получает значение метрики по имени
     * @param name Имя метрики
     * @returns Строковое значение метрики или undefined
     */
    private getValue(name: string): string | undefined {
        this.log('info', `Getting value for metric: ${name}`);
        if (!this.response?.data?.result) {
            this.log('warn', 'No data in response');
            return undefined;
        }

        const result = this.response.data.result.find(item => {
            const metricName = item.metric.__name__ || item.metric.name;
            return metricName === name;
        });

        if (!result?.value) {
            this.log('warn', `No value found for metric ${name}`);
            return undefined;
        }

        const value = result.value[1];
        this.log('info', `Found value for ${name}:`, value);
        return value;
    }

    /**
     * Получает числовое значение метрики с учетом лейблов
     * @param name Имя метрики
     * @param labels Лейблы для фильтрации
     * @returns Числовое значение метрики
     */
    private getMetricValue(name: string, labels: Record<string, string> = {}): number {
        const labelString = Object.entries(labels)
            .map(([key, value]) => `${key}="${value}"`)
            .join(',')
        const query = labelString ? `${name}{${labelString}}` : name
        return Number(this.getValue(query) || 0)
    }

    /**
     * Константы для имен метрик
     */
    private static readonly METRIC_NAMES = {
        networkRx: 'network_rx_bytes_per_second',
        networkTx: 'network_tx_bytes_per_second',
        networkErrors: 'network_errors',
        networkDropped: 'network_dropped_packets',
        diskRead: 'disk_read_bytes_per_second',
        diskWrite: 'disk_write_bytes_per_second',
        diskUsage: 'disk_usage_bytes',
        diskUsagePercent: 'disk_usage_percent',
        totalMemory: 'total_memory_bytes',
        usedMemory: 'used_memory_bytes',
        freeMemory: 'free_memory_bytes',
        gpuMemory: 'gpu_memory_bytes'
    } as const

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
     * Получает системную информацию
     * @returns Объект с системной информацией
     */
    getSystemInfo() {
        this.log('info', 'Starting to parse system info')
        
        const systemInfo = this.findMetric<SystemInformation>('system_information')
        this.log('info', 'SystemInfo', systemInfo)
        const uuid = this.findMetric<UUIDMetric>('UNIQUE_ID_SYSTEM')
        const serialNumber = this.findMetric<SerialNumber>('device_serial_number_info')

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
    getHardwareInfo() {
        const bios = this.findMetric<BiosInfo>('bios_info')
        const motherboard = this.findMetric<MotherBoardInfo>('motherboard_info')
        const memoryModules = this.findMetrics<MemoryInfo>('memory_module_info')
        const gpus = this.findMetrics<GpuInfo>('gpu_info')
        const gpuMemoryMetrics = this.findMetrics<GpuMemoryBytes>('gpu_memory_bytes')
        const disks = this.findMetrics<DiskHealthStatus>('disk_health_status')
        const cpuInfo = this.findMetric<CpuUsagePercent>('cpu_usage_percent')
        const networkInterfaces = this.findMetrics<NetworkStatus>('network_status')

        // Получаем метрики памяти для валидации
        const totalMemory = this.findMetric<TotalMemoryBytes>('total_memory_bytes')
        const usedMemory = this.findMetric<UsedMemoryBytes>('used_memory_bytes')
        const freeMemory = this.findMetric<FreeMemoryBytes>('free_memory_bytes')

        this.log('info', 'Memory metrics found:', {
            total: totalMemory ? 'yes' : 'no',
            used: usedMemory ? 'yes' : 'no',
            free: freeMemory ? 'yes' : 'no'
        })

        this.log('info', 'GPU metrics found:', {
            gpus: gpus.length,
            gpuMemory: gpuMemoryMetrics.length
        })

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
                    speed: module.speed
                })),
                usage: {
                    total: this.bytesToGB(this.getMetricValue(PrometheusParser.METRIC_NAMES.totalMemory)),
                    used: this.bytesToGB(this.getMetricValue(PrometheusParser.METRIC_NAMES.usedMemory)),
                    free: this.bytesToGB(this.getMetricValue(PrometheusParser.METRIC_NAMES.freeMemory)),
                    percent: Number((this.getMetricValue(PrometheusParser.METRIC_NAMES.usedMemory) / 
                                  this.getMetricValue(PrometheusParser.METRIC_NAMES.totalMemory) * 100).toFixed(2))
                }
            },
            disks: disks.map(disk => ({
                model: disk.disk,
                type: disk.type,
                size: this.bytesToGB(Number(disk.size)),
                health: disk.status,
                usage: {
                    total: this.bytesToGB(this.getMetricValue(PrometheusParser.METRIC_NAMES.diskUsage, { disk: disk.disk, type: 'total' })),
                    used: this.bytesToGB(this.getMetricValue(PrometheusParser.METRIC_NAMES.diskUsage, { disk: disk.disk, type: 'used' })),
                    free: this.bytesToGB(this.getMetricValue(PrometheusParser.METRIC_NAMES.diskUsage, { disk: disk.disk, type: 'free' })),
                    percent: this.getMetricValue(PrometheusParser.METRIC_NAMES.diskUsagePercent, { disk: disk.disk })
                }
            })),
            gpus: gpus.map(gpu => ({
                name: gpu.name,
                memory: {
                    total: this.bytesToGB(this.getMetricValue(PrometheusParser.METRIC_NAMES.gpuMemory, { name: gpu.name })),
                    used: this.bytesToGB(this.getMetricValue(PrometheusParser.METRIC_NAMES.gpuMemory, { name: gpu.name, type: 'used' })),
                    free: this.bytesToGB(this.getMetricValue(PrometheusParser.METRIC_NAMES.gpuMemory, { name: gpu.name, type: 'free' })),
                    percent: Number((this.getMetricValue(PrometheusParser.METRIC_NAMES.gpuMemory, { name: gpu.name, type: 'used' }) /
                                    this.getMetricValue(PrometheusParser.METRIC_NAMES.gpuMemory, { name: gpu.name, type: 'total' }) * 100).toFixed(2))
                }
            })),
            network: networkInterfaces.map(iface => ({
                name: iface.interface,
                status: this.getMetricValue('network_status', { interface: iface.interface }) === 1 ? 'up': 'down'
            }))
        }
    }

    /**
     * Получает метрики процессора
     * Включает:
     * - Модель процессора
     * - Процент использования
     * - Температуру (по датчикам и среднюю)
     * @returns Объект с метриками процессора
     */
    getProcessorMetrics() {
        const cpuUsage = this.findMetric<CpuUsagePercent>('cpu_usage_percent')
        const cpuTemperatures = this.findMetrics<CpuTemperature>('cpu_temperature')

        const sensors = cpuTemperatures.map(sensor => {
            const sensorLabels = { sensor: sensor.sensor }
            return {
                name: sensor.sensor,
                value: this.getMetricValue('cpu_temperature', sensorLabels)
            }
        })

        const average = sensors.length > 0
            ? Number((sensors.reduce((acc, sensor) => acc + sensor.value, 0) / sensors.length).toFixed(2))
            : null

        return {
            model: cpuUsage?.processor,
            usage: this.getMetricValue('cpu_usage_percent'),
            temperature: {
                sensors,
                average
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
    getNetworkMetrics() {
        // Получаем все сетевые интерфейсы
        const networkInterfaces = this.findMetrics<NetworkStatus>('network_status')

        // Получаем все метрики для валидации
        const rxMetrics = this.findMetrics<NetworkRXPerSecond>('network_rx_bytes_per_second')
        const txMetrics = this.findMetrics<NetworkTXPerSecond>('network_tx_bytes_per_second')
        const errorMetrics = this.findMetrics<NetworkErrors>('network_errors')
        const droppedMetrics = this.findMetrics<NetworkDroppedPackets>('network_dropped_packets')

        this.log('info', 'Network metrics found:', {
            interfaces: networkInterfaces.length,
            rx: rxMetrics.length,
            tx: txMetrics.length,
            errors: errorMetrics.length,
            dropped: droppedMetrics.length
        })

        return networkInterfaces.map(iface => {
            const labels = { interface: iface.interface }
            
            return {
            name: iface.interface,
                status: this.getMetricValue('network_status', labels) === 1 ? 'up' : 'down',
            performance: {
                    rx: this.bytesToGB(this.getMetricValue('network_rx_bytes_per_second', labels)),
                    tx: this.bytesToGB(this.getMetricValue('network_tx_bytes_per_second', labels))
                },
                errors: this.getMetricValue('network_errors', labels),
                droppedPackets: this.getMetricValue('network_dropped_packets', labels)
            }
        })
    }

    /**
     * Получает метрики дисков
     * Для каждого диска включает:
     * - Модель
     * - Производительность (чтение/запись)
     * - Использование (общее/использовано/свободно/процент)
     * @returns Массив объектов с метриками дисков
     */
    getDiskMetrics() {
        const disks = this.findMetrics<DiskHealthStatus>('disk_health_status')

        // Получаем все метрики для валидации
        const readMetrics = this.findMetrics<DiskReadBytesPerSecond>('disk_read_bytes_per_second')
        const writeMetrics = this.findMetrics<DiskWriteBytesPerSecond>('disk_write_bytes_per_second')
        const usageMetrics = this.findMetrics<DiskUsageBytes>('disk_usage_bytes')
        const usagePercentMetrics = this.findMetrics<DiskUsagePercent>('disk_usage_percent')

        this.log('info', 'Disk metrics found:', {
            disks: disks.length,
            read: readMetrics.length,
            write: writeMetrics.length,
            usage: usageMetrics.length,
            usagePercent: usagePercentMetrics.length
        })

        return disks.map(disk => {
            const diskLabels = { disk: disk.disk }
            
            return {
            model: disk.disk,
            type: disk.type,
            performance: {
                    rx: this.getMetricValue(PrometheusParser.METRIC_NAMES.diskRead, diskLabels),
                    tx: this.getMetricValue(PrometheusParser.METRIC_NAMES.diskWrite, diskLabels)
                },
                usage: {
                    total: this.bytesToGB(this.getMetricValue(PrometheusParser.METRIC_NAMES.diskUsage, { ...diskLabels, type: 'total' })),
                    used: this.bytesToGB(this.getMetricValue(PrometheusParser.METRIC_NAMES.diskUsage, { ...diskLabels, type: 'used' })),
                    free: this.bytesToGB(this.getMetricValue(PrometheusParser.METRIC_NAMES.diskUsage, { ...diskLabels, type: 'free' })),
                    percent: this.getMetricValue(PrometheusParser.METRIC_NAMES.diskUsagePercent, diskLabels)
                }
            }
        })
    }

    /**
     * Получает список процессов
     * @returns Информация о процессах: общее количество и топ-5 по использованию CPU
     */
    getProcessList(): ProcessListInfo {
        const activeProcesses = this.findMetrics<ActiveProcessMemoryUsage>('active_process_memory_usage')
        const processCpuUsage = this.findMetrics<ProcessCpuUsagePercent>('process_cpu_usage_percent')
        
        if (!activeProcesses.length || !processCpuUsage.length) {
            console.warn('[PROMETHEUS_PARSER] No process metrics found')
            return {
                total: 0,
                top5ByCpu: []
            }
        }

        // Собираем информацию о процессах
        const processes = new Map<string, {
            name: string
            pid: string
            cpu: number
            memory: number
        }>()

        // Добавляем информацию об использовании памяти
        activeProcesses.forEach(proc => {
            if (!proc.pid || !proc.process) return
            processes.set(proc.pid, {
                name: proc.process,
                pid: proc.pid,
                cpu: 0,
                memory: parseFloat(this.getValue(`active_process_memory_usage{pid="${proc.pid}"}`) || '0')
            })
        })

        // Добавляем информацию об использовании CPU
        processCpuUsage.forEach(proc => {
            if (!proc.pid) return
            const process = processes.get(proc.pid)
            if (process) {
                process.cpu = parseFloat(this.getValue(`process_cpu_usage_percent{pid="${proc.pid}"}`) || '0')
            }
        })

        // Сортируем по использованию CPU
        const sortedProcesses = Array.from(processes.values())
            .sort((a, b) => b.cpu - a.cpu)

        return {
            total: processes.size,
            top5ByCpu: sortedProcesses.slice(0, 5)
        }
    }

    /**
     * Парсит временной ряд метрик
     * @param metricName Имя метрики
     * @returns Массив точек [timestamp, value]
     * @throws Error если ответ не является временным рядом
     */
    parseTimeSeriesData(metricName: string): Array<[number, number]> {
        if (this.response.data.resultType !== 'matrix') {
            throw new Error('Response is not a time series (matrix)');
        }

        const result = this.response.data.result.find(r => r.metric.name === metricName);
        if (!result?.values?.length) {
            this.log('warn', `No time series data found for metric: ${metricName}`);
            return [];
        }

        return result.values.map(([timestamp, value]) => [
            Number(timestamp),
            parseFloat(value)
        ]);
    }

    /**
     * Получает последнее значение из временного ряда
     * @param metricName Имя метрики
     * @returns Последнее значение или null если данных нет
     */
    getLastValueFromTimeSeries(metricName: string): number | null {
        const timeSeries = this.parseTimeSeriesData(metricName)
        if (timeSeries.length === 0) {
            return null
        }
        return timeSeries[timeSeries.length - 1][1]
    }

    /**
     * Получает метрики памяти
     * @returns Информация о памяти устройства
     */
    public getMemoryMetrics() {
        const memoryMetric = this.findMetric('windows_cs_physical_memory_bytes');
        const memoryAvailableMetric = this.findMetric('windows_os_physical_memory_free_bytes');
        
        const memoryTotal = memoryMetric && typeof memoryMetric === 'object' && 'value' in memoryMetric ? Number(memoryMetric.value) : 0;
        const memoryAvailable = memoryAvailableMetric && typeof memoryAvailableMetric === 'object' && 'value' in memoryAvailableMetric ? Number(memoryAvailableMetric.value) : 0;
        const memoryUsed = memoryTotal - memoryAvailable;

        return {
            total: this.bytesToGB(memoryTotal),
            available: this.bytesToGB(memoryAvailable),
            used: this.bytesToGB(memoryUsed),
            usage: {
                total: memoryTotal,
                available: memoryAvailable,
                used: memoryUsed,
                percent: memoryTotal ? (memoryUsed / memoryTotal) * 100 : 0
            }
        };
    }

    private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
        // Логируем только критические ошибки и важные предупреждения
        if (level === 'error' || 
            (level === 'warn' && (
                message.includes('Failed to') ||
                message.includes('No data') ||
                message.includes('not found')
            ))) {
            const prefix = `[PROMETHEUS_PARSER]`;
            if (data) {
                console[level](`${prefix} ${message}`, data);
            } else {
                console[level](`${prefix} ${message}`);
            }
        }
    }
}