import { AlertCategory, AlertSeverity, ChangeType, ComparisonOperator } from '@/services/prometheus/alerting/alert-rules.types'
import { PROMETHEUS_METRICS } from '@/services/prometheus/metrics/constants'
import { MetricType } from '@/services/prometheus/metrics/types'

export interface AlertRulePreset {
  id: string
  name: string
  category: AlertCategory
  description: string
  metric: string
  operator: ComparisonOperator
  threshold: number | string
  duration: string
  severity: AlertSeverity
  autoFillData?: {
    metric: string
    operator: ComparisonOperator
    threshold: number | string
    duration: string
  }
}

// Пресеты правил алертов на основе реальных метрик
export const ALERT_RULE_PRESETS: AlertRulePreset[] = [
  {
    id: 'cpu_high_usage',
    name: 'Высокая нагрузка процессора',
    category: AlertCategory.PERFORMANCE,
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
    id: 'hardware_cpu_change',
    name: 'Смена процессора',
    category: AlertCategory.HARDWARE_CHANGE,
    description: 'Отслеживание изменений в конфигурации процессора на конкретном агенте',
    metric: 'cpu_usage_percent',
    operator: ComparisonOperator.GREATER_THAN,
    threshold: 0,
    duration: '1m',
    severity: AlertSeverity.CRITICAL,
    autoFillData: {
      metric: 'cpu_usage_percent',
      operator: ComparisonOperator.GREATER_THAN,
      threshold: 0,
      duration: '1m'
    }
  },
  {
    id: 'hardware_motherboard_change',
    name: 'Смена материнской платы',
    category: AlertCategory.HARDWARE_CHANGE,
    description: 'Отслеживание изменений в конфигурации материнской платы на конкретном агенте',
    metric: 'motherboard_info',
    operator: ComparisonOperator.GREATER_THAN,
    threshold: 0,
    duration: '1m',
    severity: AlertSeverity.CRITICAL,
    autoFillData: {
      metric: 'motherboard_info',
      operator: ComparisonOperator.GREATER_THAN,
      threshold: 0,
      duration: '1m'
    }
  }
  ]

// Группировка метрик по типам (для удобства выбора в UI)
export const METRIC_CATEGORIES = {
    SYSTEM: {
        name: 'Системная информация',
        metrics: PROMETHEUS_METRICS[MetricType.STATIC].system
    },

    HARDWARE: {
        name: 'Оборудование',
        metrics: PROMETHEUS_METRICS[MetricType.STATIC].hardware
    },
    CPU: {
        name: 'Процессор',
        metrics: PROMETHEUS_METRICS.dynamic.cpu
    },
    DISK: {
        name: 'Накопители',
        metrics: PROMETHEUS_METRICS[MetricType.DYNAMIC].disk
    },
    NETWORK: {
        name: 'Сеть',
        metrics: PROMETHEUS_METRICS[MetricType.DYNAMIC].network
    }

}

// Все доступные метрики из constants.ts (исключая процессы)
export const ALL_METRICS = [
  // Статические метрики - системная информация
  ...PROMETHEUS_METRICS[MetricType.STATIC].system,
  // Статические метрики - железо
  ...PROMETHEUS_METRICS[MetricType.STATIC].hardware,
  // Динамические метрики - процессор
  ...PROMETHEUS_METRICS[MetricType.DYNAMIC].cpu,
  // Динамические метрики - память
  ...PROMETHEUS_METRICS[MetricType.DYNAMIC].memory,
  // Динамические метрики - диски
  ...PROMETHEUS_METRICS[MetricType.DYNAMIC].disk,
  // Динамические метрики - сеть
  ...PROMETHEUS_METRICS[MetricType.DYNAMIC].network
]

export const PRESET_CATEGORIES = [
  {
    id: AlertCategory.HARDWARE_CHANGE,
    name: 'Смена оборудования',
    description: 'Отслеживание изменений в конфигурации оборудования',
    icon: '🔧'
  },
  {
    id: AlertCategory.PERFORMANCE,
    name: 'Производительность',
    description: 'Мониторинг производительности системы',
    icon: '⚡'
  },
  {
    id: AlertCategory.HEALTH,
    name: 'Состояние системы',
    description: 'Мониторинг состояния компонентов',
    icon: '❤️'
  },
  {
    id: AlertCategory.CUSTOM,
    name: 'Пользовательские',
    description: 'Пользовательские правила',
    icon: '⚙️'
  }
]