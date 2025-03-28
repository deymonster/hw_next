import { PrometheusService } from '../prometheus/prometheus.service'
import { EventEmitter } from 'events'

interface MetricsCache {
    [deviceId: string]: {
        lastUpdate: number
        metrics: any
    }
}

export class MetricsService {
    private readonly prometheus: PrometheusService
    private readonly cache: MetricsCache = {}
    private readonly emitter = new EventEmitter()
    private readonly updateInterval = 30000 // 30 секунд
    private readonly maxCacheAge = 120000 // 2 минуты

    constructor(prometheus: PrometheusService) {
        this.prometheus = prometheus
        this.startMetricsCollection()
    }

    // Подписка на обновления метрик для устройства
    public subscribe(deviceId: string, callback: (metrics: any) => void) {
        const eventName = `metrics:${deviceId}`
        this.emitter.on(eventName, callback)

        // Сразу отправляем закэшированные данные, если есть
        const cached = this.cache[deviceId]
        if (cached) {
            callback(cached.metrics)
        }

        // Возвращаем функцию отписки
        return () => {
            this.emitter.removeListener(eventName, callback)
        }
    }

    private async startMetricsCollection() {
        const collectMetrics = async () => {
            try {
                // Получаем все активные устройства из кэша
                const deviceIds = Object.keys(this.cache)

                for (const deviceId of deviceIds) {
                    await this.updateDeviceMetrics(deviceId)
                }

                // Очищаем старые данные из кэша
                this.cleanupCache()
            } catch (error) {
                console.error('[METRICS_SERVICE] Error collecting metrics:', error)
            }
        }

        // Запускаем сбор метрик с интервалом
        setInterval(collectMetrics, this.updateInterval)
    }

    private async updateDeviceMetrics(deviceId: string) {
        try {
            const cached = this.cache[deviceId]
            if (!cached) return

            // Получаем новые метрики
            const [systemInfo, hardwareInfo] = await Promise.all([
                this.prometheus.getSystemInfo(deviceId),
                this.prometheus.getHardwareInfo(deviceId)
            ])

            const newMetrics = {
                systemInfo,
                hardwareInfo,
                timestamp: Date.now()
            }

            // Проверяем, изменились ли метрики
            if (this.hasMetricsChanged(cached.metrics, newMetrics)) {
                // Обновляем кэш
                this.cache[deviceId] = {
                    lastUpdate: Date.now(),
                    metrics: newMetrics
                }

                // Оповещаем подписчиков
                this.emitter.emit(`metrics:${deviceId}`, newMetrics)
            }
        } catch (error) {
            console.error(`[METRICS_SERVICE] Error updating metrics for device ${deviceId}:`, error)
        }
    }

    private hasMetricsChanged(oldMetrics: any, newMetrics: any): boolean {
        // Простое сравнение JSON для определения изменений
        // В реальном приложении здесь должна быть более сложная логика
        return JSON.stringify(oldMetrics) !== JSON.stringify(newMetrics)
    }

    private cleanupCache() {
        const now = Date.now()
        for (const [deviceId, data] of Object.entries(this.cache)) {
            if (now - data.lastUpdate > this.maxCacheAge) {
                delete this.cache[deviceId]
            }
        }
    }

    // Метод для добавления устройства в мониторинг
    public addDevice(deviceId: string) {
        if (!this.cache[deviceId]) {
            this.cache[deviceId] = {
                lastUpdate: 0,
                metrics: null
            }
        }
    }

    // Метод для удаления устройства из мониторинга
    public removeDevice(deviceId: string) {
        delete this.cache[deviceId]
    }
} 