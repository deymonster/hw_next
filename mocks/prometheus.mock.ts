import { PrometheusApiResponse } from '@/services/prometheus/prometheus.interfaces';

// Статические системные метрики
const systemMetrics: PrometheusApiResponse = {
    status: 'success',
    data: {
        resultType: 'vector',
        result: [
            // System Information
            {
                metric: {
                    __name__: 'system_information',
                    instance: 'localhost:9182',
                    job: 'node',
                    manufacturer: 'Apple Inc.',
                    model: 'MacBook Pro M1',
                    name: 'MacBook Pro',
                    os_architecture: 'arm64',
                    os_version: 'Darwin 21.6.0'
                },
                value: [1625097600, '1']
            },
            // UUID
            {
                metric: {
                    __name__: 'UNIQUE_ID_SYSTEM',
                    instance: 'localhost:9182',
                    job: 'node',
                    uuid: '550e8400-e29b-41d4-a716-446655440000'
                },
                value: [1625097600, '1']
            },
            // Serial Number
            {
                metric: {
                    __name__: 'device_serial_number_info',
                    instance: 'localhost:9182',
                    job: 'node',
                    device_tag: 'DEV-001',
                    location: 'Office',
                    serial_number: 'C02E4567XXXX'
                },
                value: [1625097600, '1']
            }
        ]
    }
};

// Статические метрики оборудования
const hardwareMetrics: PrometheusApiResponse = {
    status: 'success',
    data: {
        resultType: 'vector',
        result: [
            // CPU Info
            {
                metric: {
                    __name__: 'cpu_usage_percent',
                    instance: 'localhost:9182',
                    job: 'node',
                    model: 'Apple M1 Pro',
                    cores: '10',
                    architecture: 'ARM64'
                },
                value: [1625097600, '20']
            },
            // BIOS
            {
                metric: {
                    __name__: 'bios_info',
                    instance: 'localhost:9182',
                    job: 'node',
                    manufacturer: 'Apple Inc.',
                    release_date: '2023-01-01',
                    version: '2.0'
                },
                value: [1625097600, '1']
            },
            // Motherboard
            {
                metric: {
                    __name__: 'motherboard_info',
                    instance: 'localhost:9182',
                    job: 'node',
                    manufacturer: 'Apple Inc.',
                    product: 'Mac-12345678',
                    serial_number: 'C02XL0GUJGH0',
                    version: '1.0'
                },
                value: [1625097600, '1']
            },
            // Memory Module
            {
                metric: {
                    __name__: 'memory_module_info',
                    instance: 'localhost:9182',
                    job: 'node',
                    capacity: '16GB',
                    manufacturer: 'Apple',
                    part_number: 'APPLE-MEM-16GB',
                    serial_number: 'MEM123456',
                    speed: '6400MHz'
                },
                value: [1625097600, '1']
            },
            // GPU Info
            {
                metric: {
                    __name__: 'gpu_info',
                    instance: 'localhost:9182',
                    job: 'node',
                    name: 'Apple M1 GPU'
                },
                value: [1625097600, '1']
            },
            // GPU Memory
            {
                metric: {
                    __name__: 'gpu_memory_bytes',
                    instance: 'localhost:9182',
                    job: 'node',
                    name: 'Apple M1 GPU'
                },
                value: [1625097600, '8589934592'] // 8GB
            },
            // Disk Hardware Info
            {
                metric: {
                    __name__: 'disk_health_status',
                    instance: 'localhost:9182',
                    job: 'node',
                    disk: 'Apple SSD AP0512N',
                    model: 'APPLE SSD AP0512N',
                    type: 'nvme',
                    serial: 'S123456789'
                },
                value: [1625097600, '1']
            },
        ]
    }
};

export const STATIC: PrometheusApiResponse = {
    status:'success',
    data: {
        resultType:'vector',
        result: [
            ...systemMetrics.data.result,
            ...hardwareMetrics.data.result
        ]
    }
};



// Динамические метрики
export const dynamicMetrics: PrometheusApiResponse = {
    status: 'success',
    data: {
        resultType: 'vector',
        result: [
            // CPU Usage
            {
                metric: {
                    __name__: 'cpu_usage_percent',
                    instance: 'localhost:9182',
                    job: 'node',
                    model: 'Apple M1 Pro',
                    cores: '10',
                    architecture: 'ARM64'
                },
                value: [1625097600, '20']
            },
            // CPU Temperature
            {
                metric: {
                    __name__: 'cpu_temperature',
                    instance: 'localhost:9182',
                    job: 'node',
                    sensor: 'CPU Package'
                },
                value: [1625097600, '65.5']
            },
            // Memory Metrics
            {
                metric: {
                    __name__: 'total_memory_bytes',
                    instance: 'localhost:9182',
                    job: 'node'
                },
                value: [1625097600, '17179869184'] // 16GB
            },
            {
                metric: {
                    __name__: 'used_memory_bytes',
                    instance: 'localhost:9182',
                    job: 'node'
                },
                value: [1625097600, '8589934592'] // 8GB
            },
            {
                metric: {
                    __name__: 'free_memory_bytes',
                    instance: 'localhost:9182',
                    job: 'node'
                },
                value: [1625097600, '8589934592'] // 8GB
            },
            // Disk Metrics
            {
                metric: {
                    __name__: 'disk_health_status',
                    instance: 'localhost:9182',
                    job: 'node',
                    disk: '/dev/disk0',
                    size: '512GB',
                    status: 'healthy',
                    type: 'ssd'
                },
                value: [1625097600, '1']
            },
            {
                metric: {
                    __name__: 'disk_usage_bytes',
                    instance: 'localhost:9182',
                    job: 'node',
                    disk: '/dev/disk0',
                    type: 'total'
                },
                value: [1625097600, '512000000000'] // 512GB
            },
            {
                metric: {
                    __name__: 'disk_usage_percent',
                    instance: 'localhost:9182',
                    job: 'node',
                    disk: '/dev/disk0'
                },
                value: [1625097600, '75.5']
            },
            {
                metric: {
                    __name__: 'disk_read_bytes_per_second',
                    instance: 'localhost:9182',
                    job: 'node',
                    disk: '/dev/disk0'
                },
                value: [1625097600, '52428800'] // 50MB/s
            },
            {
                metric: {
                    __name__: 'disk_write_bytes_per_second',
                    instance: 'localhost:9182',
                    job: 'node',
                    disk: '/dev/disk0'
                },
                value: [1625097600, '31457280'] // 30MB/s
            },

            // Network Metrics
            {
                metric: {
                    __name__: 'network_status',
                    instance: 'localhost:9182',
                    job: 'node',
                    interface: 'en0'
                },
                value: [1625097600, '1']
            },
            {
                metric: {
                    __name__: 'network_rx_bytes_per_second',
                    instance: 'localhost:9182',
                    job: 'node',
                    interface: 'en0'
                },
                value: [1625097600, '1048576'] // 1MB/s
            },
            {
                metric: {
                    __name__: 'network_tx_bytes_per_second',
                    instance: 'localhost:9182',
                    job: 'node',
                    interface: 'en0'
                },
                value: [1625097600, '524288'] // 512KB/s
            },
            {
                metric: {
                    __name__: 'network_errors',
                    instance: 'localhost:9182',
                    job: 'node',
                    interface: 'en0'
                },
                value: [1625097600, '0']
            },
            {
                metric: {
                    __name__: 'network_dropped_packets',
                    instance: 'localhost:9182',
                    job: 'node',
                    interface: 'en0'
                },
                value: [1625097600, '0']
            }
        ]
    }
};

// Метрики процессов
// export const processMetrics: PrometheusApiResponse = {
//     status: 'success',
//     data: {
//         resultType: 'vector',
//         result: [
//             {
//                 metric: {
//                     __name__: 'active_proccess_list',
//                     instance: 'localhost:9182',
//                     job: 'node'
//                 },
//                 value: [1625097600, '150']
//             },
//             {
//                 metric: {
//                     __name__: 'proccess_cpu_usage_percent',
//                     instance: 'localhost:9182',
//                     job: 'node',
//                     pid: '1234',
//                     process: 'chrome'
//                 },
//                 value: [1625097600, '12.5']
//             },
//             {
//                 metric: {
//                     __name__: 'active_proccess_memory_usage',
//                     instance: 'localhost:9182',
//                     job: 'node',
//                     pid: '1234',
//                     process: 'chrome'
//                 },
//                 value: [1625097600, '1073741824'] // 1GB
//             },
//             {
//                 metric: {
//                     __name__: 'cpu_usage_percent',
//                     instance: 'localhost:9182',
//                     job: 'node',
//                     model: 'Apple M1 Pro',
//                     cores: '10',
//                     architecture: 'ARM64'
//                 },
//                 value: [1625097600, '20']
//             }
//         ]
//     }
// };

export const DYNAMIC = dynamicMetrics;
//export const PROCESS = processMetrics;
 
