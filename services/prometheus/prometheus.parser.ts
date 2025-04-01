import { 
    PrometheusApiResponse, 
    PrometheusMetricResult,
    SystemInformation,
    UUIDMetric,
    SerialNumber,
    BiosInfo,
    MotherBoardInfo,
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
    MemoryMetrics,
    DiskMetrics,
    MemoryModuleInfo,
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
        const memoryModules = this.findMetrics<MemoryModuleInfo>('memory_module_info')
        const gpus = this.findMetrics<GpuInfo>('gpu_info')
        const disks = this.findMetrics<DiskHealthStatus>('disk_health_status')
        const cpuInfo = this.findMetric<CpuUsagePercent>('cpu_usage_percent')
        const networkInterfaces = this.findMetrics<NetworkStatus>('network_status')

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
                }))
            },
            disks: disks.map(disk => ({
                model: disk.disk,
                type: disk.type || 'Unknown',
                size: disk.size || '0',
                health: disk.status || 'Unknown'
            })),
            gpus: gpus.map(gpu => {
                const name = gpu.name;
                const memoryBytes = this.getMetricValue('gpu_memory_bytes', { name });
                
                return {
                    name,
                memory: {
                        total: this.bytesToMB(memoryBytes)  // Конвертируем в МБ
                }
                };
            }),
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
     * - Процент использования CPU
     * - Температуру процессора (все сенсоры и среднее значение)
     * @returns Объект с метриками процессора
     */
    getProcessorMetrics() {
        // Получаем базовую информацию о процессоре
        const cpuInfo = this.findMetric<CpuUsagePercent>('cpu_usage_percent')
        
        // Получаем все температурные сенсоры
        const cpuTemperatures = this.findMetrics<CpuTemperature>('cpu_temperature')

        // Получаем все значения температуры
        const temperatures = cpuTemperatures.map(sensor => {
            // Получаем значение температуры используя getMetricValue
            // Это более надежный способ, так как он учитывает все edge cases
            const value = this.getMetricValue('cpu_temperature', { sensor: sensor.sensor })
            
            return {
                name: sensor.sensor,    // Имя сенсора (например: \_TZ.TZ00)
                value: Number(value.toFixed(2))  // Округляем до 2 знаков
            }
        })

        // Вычисляем среднюю температуру
        const averageTemp = temperatures.length > 0
            ? Number((
                temperatures.reduce((sum, sensor) => sum + sensor.value, 0) / temperatures.length
              ).toFixed(2))
            : 0

        return {
            model: cpuInfo?.processor || '',  // Модель процессора с fallback
            usage: Math.round(this.getMetricValue('cpu_usage_percent')), // Округленный процент использования
            temperature: {
                sensors: temperatures,  // Все сенсоры с их значениями
                average: averageTemp   // Средняя температура
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
        const networkInterfaces = this.findMetrics<NetworkStatus>('network_status')

        return networkInterfaces.map(iface => {
            const labels = { interface: iface.interface }
            const status = this.getMetricValue('network_status', labels)
            
            console.log('[DEBUG] Network status for', iface.interface, ':', status)

            return {
            name: iface.interface,
                status: status === 1 ? 'up' : 'down',
            performance: {
                    rx: this.getMetricValue('network_rx_bytes_per_second', labels),
                    tx: this.getMetricValue('network_tx_bytes_per_second', labels)
                },
                errors: this.getMetricValue('network_errors', labels),
                droppedPackets: this.getMetricValue('network_dropped_packets', labels)
            }
        })
    }

    /**
     * Получает метрики дисков
     * @returns {DiskMetrics[]} Массив метрик для каждого диска
     */
    getDiskMetrics(): DiskMetrics[] {
        // Получаем базовую информацию о дисках
        const disks = this.findMetrics<DiskHealthStatus>('disk_health_status');

        return disks.map(disk => {
            const diskName = disk.disk;
            const labels = { disk: diskName };

            // Получаем значения использования диска
            const total = this.getMetricValue('disk_usage_bytes', { ...labels, type: 'total' });
            const used = this.getMetricValue('disk_usage_bytes', { ...labels, type: 'used' });
            const free = total - used;  // Вычисляем свободное место
            const percent = this.getMetricValue('disk_usage_percent', labels);

            // Получаем значения производительности
            const read = this.getMetricValue('disk_read_bytes_per_second', labels);
            const write = this.getMetricValue('disk_write_bytes_per_second', labels);

            return {
                disk: diskName,
                usage: {
                    total: this.bytesToGB(total),
                    used: this.bytesToGB(used),
                    free: this.bytesToGB(free),
                    percent: Number(percent.toFixed(2))
                },
            performance: {
                    read: read,
                    write: write
                }
            };
        });
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
     * @returns {MemoryMetrics} Информация об использовании памяти
     */
    public getMemoryMetrics(): MemoryMetrics {
        // Получаем метрики из Prometheus
        const totalMetric = this.findMetric('total_memory_bytes');
        const usedMetric = this.findMetric('used_memory_bytes');
        
        // Парсим значения, используя 0 как значение по умолчанию
        const total = totalMetric && typeof totalMetric === 'object' && 'value' in totalMetric 
            ? Number(totalMetric.value) 
            : 0;
            
        const used = usedMetric && typeof usedMetric === 'object' && 'value' in usedMetric 
            ? Number(usedMetric.value) 
            : 0;

        // Вычисляем производные значения
        const free = total - used;
        const percent = total ? (used / total) * 100 : 0;

        // Конвертируем байты в гигабайты для отображения
        return {
            total: this.bytesToGB(total),
            used: this.bytesToGB(used),
            free: this.bytesToGB(free),
            percent: Number(percent.toFixed(2))
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