import { useState, useEffect } from 'react'
import { DeviceMetrics } from '@/services/prometheus/prometheus.interfaces'

/**
 * Хук для получения метрик устройства в реальном времени через SSE
 * @param deviceId - ID устройства
 * @returns объект с метриками и ошибкой
 * 
 * @example
 * ```tsx
 * function DeviceDetails({ deviceId }) {
 *   const { metrics, error } = useDeviceMetrics(deviceId)
 *   
 *   if (error) return <div>Error: {error.message}</div>
 *   if (!metrics) return <div>Loading...</div>
 *   
 *   return <div>{metrics.systemInfo.name}</div>
 * }
 * ```
 */
export function useDeviceMetrics(deviceId: string) {
    const [metrics, setMetrics] = useState<DeviceMetrics | null>(null)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        if (!deviceId) return

        // Создаем SSE соединение
        const eventSource = new EventSource(`/api/metrics/stream/${deviceId}`)

        // Обработка получения данных
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                setMetrics(data)
            } catch (err) {
                setError(new Error('Failed to parse metrics data'))
            }
        }

        // Обработка ошибок
        eventSource.onerror = () => {
            setError(new Error('Failed to connect to metrics stream'))
            eventSource.close()
        }

        // Очистка при размонтировании компонента
        return () => {
            eventSource.close()
        }
    }, [deviceId])

    return { metrics, error }
} 