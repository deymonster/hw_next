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
        console.log(`Finding metrics: ${name}`);
        if (!this.response?.data?.result) {
            console.warn('No data in response');
            return [];
        }

        const results = this.response.data.result.filter(item => {
            const metricName = item.metric.__name__ || item.metric.name;
            return metricName === name;
        });

        console.log(`Found ${results.length} metrics for ${name}`);
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
        
        
        if (!this.response?.data?.result) {
            console.warn('[PROMETHEUS_PARSER][METRIC_VALUE] No data in response');
            return 0;
        }
    
        // Логируем все доступные метрики для отладки
        const availableMetrics = this.response.data.result
            .filter(item => item.metric.__name__ === name)
            .map(item => ({
                name: item.metric.__name__,
                labels: item.metric,
                value: item.value
            }));
        
        
    
        // Ищем метрику, которая соответствует имени и всем переданным лейблам
        const result = this.response.data.result.find(item => {
            // Проверяем имя метрики
            if (item.metric.__name__ !== name) {
                
                return false;
            }
    
            // Проверяем все переданные лейблы
            const labelsMatch = Object.entries(labels).every(([key, value]) => {
                const metricValue = item.metric[key];
                const matches = metricValue === value;
                
                return matches;
            });
            return labelsMatch;
        });
    
        if (!result) {
            console.warn(`[PROMETHEUS_PARSER][METRIC_VALUE] No metric found for ${name} with labels:`, labels);
            return 0;
        }
    
        const value = result.value?.[1];
        
    
        if (!value) {
            console.warn(`[PROMETHEUS_PARSER][METRIC_VALUE] No value found for metric ${name}`);
            return 0;
        }
    
        return Number(value);
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
    private formatBytesPerSecond(bytesPerSecond: number): { value: number; unit: string } {
        if (bytesPerSecond >= 1024 * 1024 * 1024) {
            return { value: Number((bytesPerSecond / (1024 * 1024 * 1024)).toFixed(2)), unit: 'Gb/s' };
        }
        if (bytesPerSecond >= 1024 * 1024) {
            return { value: Number((bytesPerSecond / (1024 * 1024)).toFixed(2)), unit: 'Mb/s' };
        }
        if (bytesPerSecond >= 1024) {
            return { value: Number((bytesPerSecond / 1024).toFixed(2)), unit: 'Kb/s' };
        }
        return { value: Number(bytesPerSecond.toFixed(2)), unit: 'B/s' };
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
                
                // Возвращаем объект с информацией о GPU
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
            
            const rxBytes = this.getMetricValue('network_rx_bytes_per_second', labels)
            const txBytes = this.getMetricValue('network_tx_bytes_per_second', labels)

            const rx = this.formatBytesPerSecond(rxBytes)
            const tx = this.formatBytesPerSecond(txBytes)



            return {
                name: iface.interface,
                status: status === 1 ? 'up' : 'down',
                performance: {
                    rx: { value: rx.value, unit: rx.unit },
                    tx: { value: tx.value, unit: tx.unit }
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
        
        const diskUsageMetrics = this.response.data.result
            .filter(item => item.metric.__name__ === 'disk_usage_bytes')
            .map(item => ({
                letter: item.metric.disk,
                type: item.metric.type,
                value: item.value?.[1] || '0'  
            }));
        const diskLetters = [...new Set(diskUsageMetrics
            .filter(m => m.type === 'total')
            .map(m => m.letter))];
        
        return diskLetters.map(letter => {
            const diskName = letter || 'unknown';
            const labels = { disk: diskName };
    
            const total = this.getMetricValue('disk_usage_bytes', { ...labels, type: 'total' });
            const used = this.getMetricValue('disk_usage_bytes', { ...labels, type: 'used' });
            const free = total - used;
            const percent = this.getMetricValue('disk_usage_percent', labels);
    
            const readSpeed = this.getMetricValue('disk_read_bytes_per_second', labels);
            const writeSpeed = this.getMetricValue('disk_write_bytes_per_second', labels);
            
            const read = this.formatBytesPerSecond(readSpeed);
            const write = this.formatBytesPerSecond(writeSpeed);

            const healthInfo = disks.find(d => d.disk === diskName);
            return {
                disk: healthInfo?.disk || letter || 'Unknown',  // Добавляем fallback значение
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
            };
        });
        
    }

    /**
     * Получает список процессов
     * @returns Информация о процессах: общее количество и топ-5 по использованию CPU
     */
    getProcessList(): ProcessListInfo {
        const totalProcesses = Math.round(this.getMetricValue('active_proccess_list'));
        const activeProcesses = this.findMetrics<ActiveProcessMemoryUsage>('active_proccess_memory_usage')
        const processCpuUsage = this.findMetrics<ProcessCpuUsagePercent>('proccess_cpu_usage_percent')
        
        if (!activeProcesses.length || !processCpuUsage.length) {
            console.warn('[PROMETHEUS_PARSER] No process metrics found')
            return {
                total: totalProcesses,
                processes: []
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
        // Добавляем информацию об использовании памяти
        activeProcesses.forEach(proc => {
            if (!proc.pid || !proc.process) return;
            const memoryValue = this.getMetricValue('active_proccess_memory_usage', {
                pid: proc.pid,
                process: proc.process
            });
            
            processes.set(proc.pid, {
                name: proc.process,
                pid: proc.pid,
                cpu: 0,
                memory: Number(memoryValue.toFixed(1))
            });
        });

        // Добавляем информацию об использовании CPU
        processCpuUsage.forEach(proc => {
            if (!proc.pid) return;
            const process = processes.get(proc.pid);
            if (process) {
                const cpuValue = this.getMetricValue('proccess_cpu_usage_percent', {
                    pid: proc.pid,
                    process: process.name
                });
                process.cpu = Number(cpuValue.toFixed(1));
            }
        });

        // Преобразуем Map в массив процессов
        const processList = Array.from(processes.values());

        return {
            total: totalProcesses,
            processes: processList
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
        const total = this.getMetricValue('total_memory_bytes');
        const used = this.getMetricValue('used_memory_bytes');
        const free = this.getMetricValue('free_memory_bytes');


        // Вычисляем процент использования
        const percent = total ? (used / total) * 100 : 0;

        // Конвертируем байты в гигабайты для отображения
        return {
            total: this.bytesToMB(total),
            used: this.bytesToMB(used),
            free: this.bytesToMB(free),
            percent: Number(percent.toFixed(2))
        };
    }

    private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
        const prefix = `[PROMETHEUS_PARSER]`;
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ${message}`, data || '');
                break;
            case 'warn':
                console.warn(`${prefix} ${message}`, data || '');
                break;
            case 'info':
                console.log(`${prefix} ${message}`, data || '');
                break;
        }
    }
}