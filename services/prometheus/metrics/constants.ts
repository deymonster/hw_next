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
			'gpu_type_info',
			'gpu_memory_bytes',
			'disk_health_status',
			'network_status'
		]
	},
	[MetricType.DYNAMIC]: {
		/** Метрики процессора */
		cpu: ['cpu_usage_percent', 'cpu_temperature'],
		/** Метрики памяти */
		memory: [
			'total_memory_bytes',
			'used_memory_bytes',
			'free_memory_bytes'
		],
		/** Метрики дисков */
		disk: [
			'disk_health_status',
			'disk_read_bytes_per_second',
			'disk_write_bytes_per_second',
			'disk_usage_bytes',
			'disk_usage_percent'
		],
		/** Метрики сети */
		network: [
			'network_status',
			'network_rx_bytes_per_second',
			'network_tx_bytes_per_second',
			'network_errors',
			'network_dropped_packets'
		]
	},
        [MetricType.PROCESS]: {
                /** Метрики процессов */
                process: [
                        'active_process_list',
                        'process_cpu_usage_percent',
                        'active_process_memory_usage',
                        'cpu_usage_percent',
                        'process_instance_count',
                        'process_group_memory_workingset_mb',
                        'process_group_memory_private_mb',
                        'process_group_cpu_usage_percent'
                ]
        }
} as const
