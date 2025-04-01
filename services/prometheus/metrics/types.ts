/**
 * Типы метрик Prometheus
 */
export enum MetricType {
    /** Статические метрики (системная информация, железо) */
    STATIC = 'static',
    /** Динамические метрики (CPU, память, сеть, диски) */
    DYNAMIC = 'dynamic',
    /** Метрики процессов */
    PROCESS = 'process'
}