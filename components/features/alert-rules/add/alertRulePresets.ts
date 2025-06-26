import { AlertCategory, AlertSeverity, ComparisonOperator } from '@/services/prometheus/alerting/alert-rules.types'
import { PROMETHEUS_METRICS } from '@/services/prometheus/metrics/constants'
import { MetricType } from '@/services/prometheus/metrics/types'


export interface AlertRulePreset {
  id: string
  name: string
  category: AlertCategory
  description: string
  metric: string
  operator?: ComparisonOperator
  threshold?: number | string
  duration?: string
  severity: AlertSeverity
  autoFillData?: {
    metric: string
    operator?: ComparisonOperator
    threshold?: number | string
    duration?: string
  }
}

// Пресеты правил алертов на основе реальных метрик
export const ALERT_RULE_PRESETS: AlertRulePreset[] = [
  {
    id: 'cpu_high_usage',
    name: 'Высокая нагрузка процессора',
    category: AlertCategory.CPU_MONITORING,
    description: 'Превышение нагрузки процессора выше 80% на конкретном агенте',
    metric: 'cpu_usage_percent',
    operator: ComparisonOperator.GREATER_THAN,
    threshold: 80,
    duration: '5m',
    severity: AlertSeverity.WARNING,
    autoFillData: {
      metric: 'cpu_usage_percent',
      operator: ComparisonOperator.GREATER_THAN,
      threshold: 80,
      duration: '5m'
    }
  },
  {
    id: 'hardware_change_control',
    name: 'Контроль Изменения оборудования',
    category: AlertCategory.HARDWARE_CHANGE,
    description: 'Отслеживание любых изменений в конфигурации оборудования',
    metric: 'Hardware_Change_Detected',
    severity: AlertSeverity.CRITICAL,
    autoFillData: {
      metric: 'Hardware_Change_Detected'
    }
  }
  ]

// Группировка метрик по типам (для удобства выбора в UI)
export const METRIC_CATEGORIES = {
    HARDWARE_CHANGE: {
      id: 'HARDWARE_CHANGE',
      name: 'Контроль изменения оборудования',
      description: 'Отслеживание изменений в конфигурации железа',
      metrics: ['Hardware_Change_Detected'],
      requiresThreshold: false,
      icon: '🔧'
    },

    CPU_MONITORING: {
      id: 'CPU_MONITORING', 
      name: 'Контроль процессора',
      description: 'Мониторинг температуры и нагрузки CPU',
      subcategories: {
        TEMPERATURE_CONTROL: {
          id: 'TEMPERATURE_CONTROL',
          name: 'Контроль температуры',
          description: 'Мониторинг температуры процессора',
          metrics: [
            {
              name: 'cpu_temperature',
              label: 'Температура процессора (°C)',
              defaultThreshold: 75,
              operator: 'GREATER_THAN'
            }
          ],
          requiresThreshold: true,
          icon: '🌡️'
        },
        LOAD_CONTROL: {
          id: 'LOAD_CONTROL',
          name: 'Контроль нагрузки процессора',
          description: 'Мониторинг нагрузки процессора',
          metrics: [
            {
              name: 'cpu_usage_percent', 
              label: 'Нагрузка процессора (%)',
              defaultThreshold: 80,
              operator: 'GREATER_THAN'
            }
          ],
          requiresThreshold: true,
          icon: '⚡'
        }
      },
      requiresThreshold: true,
      icon: '🖥️'
    },

    DISK_MONITORING: {
      id: 'DISK_MONITORING',
      name: 'Контроль дисков',
      description: 'Мониторинг использования дискового пространства',
      subcategories: {
        DISK_USAGE_PERCENT: {
          id: 'DISK_USAGE_PERCENT',
          name: 'Контроль использования диска (%)',
          description: 'Мониторинг процентного использования диска',
          metrics: [
            {
              name: 'disk_usage_percent',
              label: 'Использование диска (%)', 
              defaultThreshold: 90,
              operator: 'GREATER_THAN'
            }
          ],
          requiresThreshold: true,
          icon: '📊'
        },
        DISK_USAGE_BYTES: {
          id: 'DISK_USAGE_BYTES',
          name: 'Контроль использования диска (байты)',
          description: 'Мониторинг использования диска в байтах',
          metrics: [
            {
              name: 'disk_usage_bytes',
              label: 'Использование диска (байты)',
              defaultThreshold: null,
              operator: 'GREATER_THAN'
            }
          ],
          requiresThreshold: true,
          icon: '💽'
        }
      },
      requiresThreshold: true,
      icon: '💾'
    },

    NETWORK_MONITORING: {
      id: 'NETWORK_MONITORING',
      name: 'Контроль сети',
      description: 'Мониторинг сетевого подключения и ошибок',
      subcategories: {
        NETWORK_STATUS: {
          id: 'NETWORK_STATUS',
          name: 'Контроль статуса сети',
          description: 'Мониторинг статуса сетевого подключения',
          metrics: [
            {
              name: 'network_status',
              label: 'Статус сетевого подключения',
              defaultThreshold: 0,
              operator: 'EQUALS'
            }
          ],
          requiresThreshold: true,
          icon: '📡'
        },
        NETWORK_ERRORS: {
          id: 'NETWORK_ERRORS',
          name: 'Контроль сетевых ошибок',
          description: 'Мониторинг количества сетевых ошибок',
          metrics: [
            {
              name: 'network_errors',
              label: 'Количество сетевых ошибок',
              defaultThreshold: 10,
              operator: 'GREATER_THAN'
            }
          ],
          requiresThreshold: true,
          icon: '⚠️'
        }
      },
      requiresThreshold: true,
      icon: '🌐'
    }
}

export const PRESET_CATEGORIES = Object.values(METRIC_CATEGORIES)



