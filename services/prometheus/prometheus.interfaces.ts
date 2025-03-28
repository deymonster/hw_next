// =====================================
// Конфигурационные интерфейсы
// =====================================

/**
 * Конфигурация цели Prometheus
 */
export interface PrometheusTarget {
    targets: string[]
    labels: {
        job:  string
        instance?: string
    }
}

/**
 * Конфигурация сервиса Prometheus
 */
export interface PrometheusServiceConfig {
    url: string
    targetsPath?: string  // Опционально, нужно только при прямом управлении целями Prometheus
    auth: {
        username: string
        password: string
    }
}

// =====================================
// Базовые интерфейсы метрик
// =====================================

/**
 * Базовый интерфейс для всех метрик
 */
export interface MetricBase {
    instance: string
    job: string
}

// =====================================
// Системные метрики
// =====================================

/**
 * Метрика уникального идентификатора системы
 */
export interface UUIDMetric extends MetricBase {
    __name__: 'UNIQUE_ID_SYSTEM'
    uuid: string
}

/**
 * Информация о системе
 */
export interface SystemInformation extends MetricBase {
    __name__: 'system_information'
    manufacturer: string
    model: string
    name:  string
    os_architecture: string
    os_version: string
}

/**
 * Информация о серийном номере устройства
 */
export interface SerialNumber extends MetricBase {
    __name__: 'device_serial_number_info'
    device_tag: string
    location: string
    serial_number: string
}

// =====================================
// Метрики процессов
// =====================================

/**
 * Список активных процессов
 */
export interface ActiveProcessList extends MetricBase {
    __name__: 'active_proccess_list'
}

/**
 * Использование памяти активным процессом
 */
export interface ActiveProcessMemoryUsage extends MetricBase {
    __name__: 'active_process_memory_usage'
    pid: string
    process: string
}

/**
 * Использование CPU процессом в процентах
 */
export interface ProcessCpuUsagePercent extends MetricBase {
    __name__: 'process_cpu_usage_percent'
    pid: string
    process: string
}

// =====================================
// Сетевые метрики
// =====================================

/**
 * Статус сетевого интерфейса
 */
export interface NetworkStatus extends MetricBase {
    __name__: 'network_status'
    interface: string
}

/**
 * Скорость приема данных по сети (байт/сек)
 */
export interface NetworkRXPerSecond extends MetricBase {
    __name__: 'network_rx_bytes_per_second'
    interface: string
}

/**
 * Скорость передачи данных по сети (байт/сек)
 */
export interface NetworkTXPerSecond extends MetricBase {
    __name__: 'network_tx_bytes_per_second'
    interface: string
}

/**
 * Ошибки сетевого интерфейса
 */
export interface NetworkErrors extends MetricBase {
    __name__: 'network_errors'
    interface: string
}

/**
 * Потерянные пакеты сетевого интерфейса
 */
export interface NetworkDroppedPackets extends MetricBase {
    __name__: 'network_dropped_packets'
    interface: string
}

// =====================================
// Метрики аппаратного обеспечения
// =====================================

/**
 * Информация о материнской плате
 */
export interface MotherBoardInfo extends MetricBase {
    __name__: 'motherboard_info'
    manufacturer: string
    product: string
    serial_number: string
    version: string
}

/**
 * Информация о модуле памяти
 */
export interface MemoryInfo extends MetricBase {
    __name__: 'memory_module_info'
    capacity: string
    manufacturer: string
    part_number: string
    serial_number: string
    speed: string
}

/**
 * Общий объем памяти в байтах
 */
export interface TotalMemoryBytes extends MetricBase {
    __name__: 'total_memory_bytes'
}

/**
 * Использованная память в байтах
 */
export interface UsedMemoryBytes extends MetricBase {
    __name__: 'used_memory_bytes'
}

/**
 * Свободная память в байтах
 */
export interface FreeMemoryBytes extends MetricBase {
    __name__: 'free_memory_bytes'
}

/**
 * Информация о GPU
 */
export interface GpuInfo extends MetricBase {
    __name__: 'gpu_info'
    name: string
}

/**
 * Память GPU в байтах
 */
export interface GpuMemoryBytes extends MetricBase {
    __name__: 'gpu_memory_bytes'
    name: string
}

/**
 * Статус здоровья диска
 */
export interface DiskHealthStatus extends MetricBase {
    __name__: 'disk_health_status'
    disk: string
    size: string
    status: string
    type: string
}

/**
 * Использование диска в байтах
 */
export interface DiskUsageBytes extends MetricBase {
    __name__: 'disk_usage_bytes'
    disk: string
    type: string
}

/**
 * Использование диска в процентах
 */
export interface DiskUsagePercent extends MetricBase {
    __name__: 'disk_usage_percent'
    disk: string
}

/**
 * Скорость чтения с диска (байт/сек)
 */
export interface DiskReadBytesPerSecond extends MetricBase {
    __name__: 'disk_read_bytes_per_second'
    disk: string
}

/**
 * Скорость записи на диск (байт/сек)
 */
export interface DiskWriteBytesPerSecond extends MetricBase {
    __name__: 'disk_write_bytes_per_second'
    disk: string
}

/**
 * Использование CPU в процентах
 */
export interface CpuUsagePercent extends MetricBase {
    __name__: 'cpu_usage_percent'
    core: string
    processor: string
}

/**
 * Температура CPU
 */
export interface CpuTemperature extends MetricBase {
    __name__: 'cpu_temperature'
    sensor: string
}

/**
 * Информация о BIOS
 */
export interface BiosInfo extends MetricBase {
    __name__: 'bios_info'
    manufacturer: string
    release_date: string
    version: string
}

// =====================================
// Метрики временных рядов
// =====================================

/**
 * Тип значения метрики: [timestamp, value]
 */
type MetricValue = [number, string]

/**
 * Результат запроса к Prometheus API
 */
export interface PrometheusMetricResult {
    metric: {
        __name__: string;
        instance: string;
        job: string;
        [key: string]: string;  // Для дополнительных лейблов
    };
    value?: [number, string];
    values?: Array<[number, string]>;
}

/**
 * Ответ Prometheus API
 */
export interface PrometheusApiResponse {
    status: 'success' | 'error';
    error?: string;
    data: {
        resultType: 'vector' | 'matrix';
        result: Array<{
            metric: {
                __name__: string;
                name?: string;
                instance: string;
                job: string;
                [key: string]: string | undefined;  // Разрешаем undefined значения
            };
            value?: [number, string];
            values?: Array<[number, string]>;
        }>;
    };
}

/**
 * Статус агента Prometheus
 */
export interface AgentStatus {
    health: string
    lastError: string
    lastScrape: string
    lastScrapeDuration: number
    scrapeInterval: string
    scrapeTimeout: string
    up: boolean
}

/**
 * Метрики устройства
 */
export interface DeviceMetrics {
    systemInfo: {
        manufacturer: string;
        model: string;
        osArchitecture: string;
        osVersion: string;
        serialNumber: string;
    };
    hardwareInfo: {
        cpu: {
            model: string;
            cores: number;
            threads: number;
        };
        memory: {
            usage: {
                total: number;
                used: number;
                free: number;
                percent: number;
            };
        };
        disks: Array<{
            model: string;
            health: string;
            usage: {
                total: number;
                used: number;
                free: number;
                percent: number;
            };
        }>;
    };
    processorMetrics: {
        usage: number;
        temperature: {
            sensors: Array<{
                name: string;
                value: number;
            }>;
            average: number;
        };
    };
    networkMetrics: Array<{
        name: string;
        status: string;
        performance: {
            rx: number;
            tx: number;
        };
        errors: number;
        droppedPackets: number;
    }>;
    diskMetrics: Array<{
        model: string;
        performance: {
            rx: number;
            tx: number;
        };
    }>;
    processList: Array<{
        name: string;
        pid: number;
        metrics: {
            cpu: number;
            memory: {
                percent: number;
                mb: number;
            };
        };
    }>;
    timestamp?: number;
}

/**
 * Точка временного ряда
 */
export interface TimeSeriesPoint {
    timestamp: number;
    value: number;
}

export interface TimeSeriesData {
    metricName: string;
    points: TimeSeriesPoint[];
}

export interface CpuMetric {
    name: string;
    core?: string;
    instance: string;
    job: string;
    processor?: string;
    value: string;
}

export type TimeRange = '5m' | '10m' | '15m' | '30m' | '1h' | '3h' | '6h' | '12h' | '24h';

export interface TimeRangeParams {
    start?: number;    // unix timestamp в секундах
    end?: number;      // unix timestamp в секундах
    range?: TimeRange; // предустановленный период
    step?: string;     // шаг для точек данных (например, "15s")
}

export interface MetricTimeSeriesValue {
    timestamp: number;
    value: number;
}

export interface MetricTimeSeries {
    metric: {
        name: string;
        instance: string;
        job: string;
        [key: string]: string;  // дополнительные лейблы
    };
    values: MetricTimeSeriesValue[];
}

/**
 * Информация о процессе
 */
export interface ProcessInfo {
    name?: string;
    pid?: string;
    working_set?: string;
    [key: string]: string | undefined;
}

/**
 * Использование CPU процессом
 */
export interface ProcessCpuUsage {
    pid?: string;
    value?: string;
    [key: string]: string | undefined;
}

/**
 * Информация о процессах с метриками
 */
export interface ProcessListInfo {
    total: number;
    top5ByCpu: {
        name: string;
        pid: string;
        cpu: number;
        memory: number;
    }[];
}












