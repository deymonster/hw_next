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
    auth: {
        username: string
        password: string
    }
}

// Базовая структура метрики
export interface MetricBase {
    instance: string
    job: string
}

export interface UUIDMetric extends MetricBase {
    __name__: 'UNIQUE_ID_SYSTEM'
    uuid: string
}

export interface SystemInformation extends MetricBase {
    __name__: 'system_information'
    manufacturer: string
    model: string
    name:  string
    os_architecture: string
    os_version: string
}

export interface SerialNumber extends MetricBase {
    __name__: 'device_serial_number_info'
    device_tag: string
    location: string
    serial_number: string
}

export interface ActiveProcessList extends MetricBase {
    __name__: 'active_proccess_list'
}

export interface ActiveProcessMemoryUsage extends MetricBase {
    __name__: 'active_proccess_memory_usage'
    pid: string
    process: string
}


export interface ProccessCpuUsagePercent extends MetricBase {
    __name__: 'proccess_cpu_usage_percent'
    pid: string
    process: string
}


export interface NetworkStatus extends MetricBase {
    __name__: 'network_status'
    interface: string
}

export interface NetworkRXPerSecond extends MetricBase {
    __name__: 'network_rx_bytes_per_second'
    interface: string
}


export interface NetworkTXPerSecond extends MetricBase {
    __name__: 'network_tx_bytes_per_second'
    interface: string
}


export interface NetworkErrors extends MetricBase {
    __name__: 'network_errors'
    interface: string
}


export interface NetworkDroppedPackets extends MetricBase {
    __name__: 'network_dropped_packets'
    interface: string
}


export interface MotherBoardInfo extends MetricBase {
    __name__: 'motherboard_info'
    manufacturer: string
    product: string
    serial_number: string
    version: string
}


export interface MemoryInfo extends MetricBase {
    __name__: 'memory_module_info'
    capacity: string
    manufacturer: string
    part_number: string
    serial_number: string
    speed: string
}

export interface TotalMemoryBytes extends MetricBase {
    __name__: 'total_memory_bytes'
}

export interface UsedMemoryBytes extends MetricBase {
    __name__: 'used_memory_bytes'
}

export interface FreeMemoryBytes extends MetricBase {
    __name__: 'free_memory_bytes'
}


export interface GpuInfo extends MetricBase {
    __name__: 'gpu_info'
    name: string
}

export interface GpuMemoryBytes extends MetricBase {
    __name__: 'gpu_memory_bytes'
    name: string
}

export interface DiskHealthStatus extends MetricBase {
    __name__: 'disk_health_status'
    disk: string
    size: string
    status: string
    type: string
}
 
export interface DiskUsageBytes extends MetricBase {
    __name__: 'disk_usage_bytes'
    disk: string
    type: string
}

export interface DiskUsagePercent extends MetricBase {
    __name__: 'disk_usage_percent'
    disk: string
}

export interface DiskReadBytesPerSecond extends MetricBase {
    __name__: 'disk_read_bytes_per_second'
    disk: string
}


export interface DiskWriteBytesPerSecond extends MetricBase {
    __name__: 'disk_write_bytes_per_second'
    disk: string
}

export interface CpuUsagePercent extends MetricBase {
    __name__: 'cpu_usage_percent'
    core: string
    processor: string
}


export interface CpuTemperature extends MetricBase {
    __name__: 'cpu_temperature'
    sensor: string
}

export interface BiosInfo extends MetricBase {
    __name__: 'bios_info'
    manufacturer: string
    release_date: string
    version: string
}

type MetricValue = [number, string]

export interface PrometheusMetricResult {
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










