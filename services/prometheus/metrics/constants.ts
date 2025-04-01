import { MetricType } from './types'

/**
 * Конфигурация метрик Prometheus
 * Группировка по типам и категориям
 */
export const PROMETHEUS_METRICS = {
    [MetricType.STATIC]: {
        /** Системная информация */
        system: [
            'system_information',
            'UNIQUE_ID_SYSTEM',
            'device_serial_number_info'
        ],
        /** Информация о железе */
        hardware: [
            'cpu_usage_percent',
            'bios_info',
            'motherboard_info',
            'memory_module_info',
            'gpu_info',
            'disk_health_status',
            'network_status'
        ]
    }
} as const