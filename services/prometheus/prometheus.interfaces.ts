export interface PrometheusTarget {
    targets: string[]
    labels: {
        job:  string
        instance?: string
    }
}

export interface PrometheusServiceConfig {
    url: string
    targetsPath: string
}

// Базовая структура метрики
interface MetricBase {
    instance: string
    job: string
}

interface UUIDMetric extends MetricBase {
    __name__: 'UNIQUE_ID_SYSTEM'
    uuid: string
}

interface SystemInformation extends MetricBase {
    __name__: 'system_information'
    manufacturer: string
    model: string
    name:  string
    os_architecture: string
    os_version: string
}

interface SerialNumber extends MetricBase {
    __name__: 'device_serial_number_info'
    device_tag: string
    location: string
    serial_number: string
}

interface ActiveProcessList extends MetricBase {
    __name__: 'active_proccess_list'
}

interface ActiveProcessMemoryUsage extends MetricBase {
    __name__: 'active_proccess_memory_usage'
    pid: string
    process: string
}


interface ProccessCpuUsagePercent extends MetricBase {
    __name__: 'proccess_cpu_usage_percent'
    pid: string
    process: string
}


interface NetworkStatus extends MetricBase {
    __name__: 'network_status'
    interface: string
}

interface NetworkRXPerSecond extends MetricBase {
    __name__: 'network_rx_bytes_per_second'
    interface: string
}


interface NetworkTXPerSecond extends MetricBase {
    __name__: 'network_tx_bytes_per_second'
    interface: string
}


interface NetworkErrors extends MetricBase {
    __name__: 'network_errors'
    interface: string
}


interface NetworkDroppedPackets extends MetricBase {
    __name__: 'network_dropped_packets'
    interface: string
}


interface MotherBoardInfo extends MetricBase {
    __name__: 'motherboard_info'
    manufacturer: string
    product: string
    serial_number: string
    version: string
}


interface MemoryInfo extends MetricBase {
    __name__: 'memory_module_info'
    capacity: string
    manufacturer: string
    part_number: string
    serial_number: string
    speed: string
}

interface TotalMemoryBytes extends MetricBase {
    __name__: 'total_memory_bytes'
}

interface UsedMemoryBytes extends MetricBase {
    __name__: 'used_memory_bytes'
}

interface FreeMemoryBytes extends MetricBase {
    __name__: 'free_memory_bytes'
}


interface GpuInfo extends MetricBase {
    __name__: 'gpu_info'
    name: string
}

interface GpuMemoryBytes extends MetricBase {
    __name__: 'gpu_memory_bytes'
    name: string
}

interface DiskHealthStatus extends MetricBase {
    __name__: 'disk_health_status'
    disk: string
    size: string
    status: string
    type: string
}

interface DiskUsageBytes extends MetricBase {
    __name__: 'disk_usage_bytes'
    disk: string
    type: string
}

interface DiskUsagePercent extends MetricBase {
    __name__: 'disk_usage_percent'
    disk: string
}

interface DiskReadBytesPerSecond extends MetricBase {
    __name__: 'disk_read_bytes_per_second'
    disk: string
}


interface DiskWriteBytesPerSecond extends MetricBase {
    __name__: 'disk_write_bytes_per_second'
    disk: string
}

interface CpuUsagePercent extends MetricBase {
    __name__: 'cpu_usage_percent'
    core: string
    processor: string
}


interface CpuTemperature extends MetricBase {
    __name__: 'cpu_temperature'
    sensor: string
}

interface BiosInfo extends MetricBase {
    __name__: 'bios_info'
    manufacturer: string
    release_date: string
    version: string
}

type MetricValue = [number, string]

interface PrometheusMetricResult {
    metric: BiosInfo |
            CpuTemperature |
            CpuUsagePercent |
            DiskReadBytesPerSecond |
            DiskWriteBytesPerSecond |
            DiskUsagePercent |
            DiskUsageBytes |
            DiskHealthStatus |
            GpuMemoryBytes |
            GpuInfo |
            FreeMemoryBytes |
            UsedMemoryBytes |
            TotalMemoryBytes |
            MemoryInfo |
            MotherBoardInfo |
            NetworkDroppedPackets |
            NetworkErrors |
            NetworkTXPerSecond |
            NetworkRXPerSecond |
            NetworkStatus |
            ProccessCpuUsagePercent |
            ActiveProcessMemoryUsage |
            ActiveProcessList |
            SerialNumber |
            SystemInformation |
            UUIDMetric
    value: MetricValue
}

export interface PrometheusApiResponse {
    status: 'success' | 'error'
    data: {
        resultType: 'vector'
        result: PrometheusMetricResult[]
    }
}










