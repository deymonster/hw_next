import { useState, useEffect } from 'react'
import { DeviceMetrics } from '@/services/prometheus/prometheus.interfaces'


const metricsCache = new Map<string, DeviceMetrics>()
const activeConnections = new Map<string, EventSource>()
const connectionSubscribers = new Map<string, number>()




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
    const [metrics, setMetrics] = useState<DeviceMetrics | null>(() => 
        metricsCache.get(deviceId) || null
    )
    const [error, setError] = useState<Error | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)

    useEffect(() => {
        if (!deviceId) return

        // Увеличиваем счетчик подписчиков
        const currentSubscribers = connectionSubscribers.get(deviceId) || 0
        connectionSubscribers.set(deviceId, currentSubscribers + 1)
        console.log('useDeviceMetrics', 'info',`[SSE] New subscriber for device ${deviceId}, total subscribers: ${currentSubscribers + 1}`);

        // Проверяем существующее соединение
        let eventSource = activeConnections.get(deviceId)

        if (!eventSource) {
            const startTime = Date.now();
            console.log('useDeviceMetrics', 'info', `[SSE] Opening new connection for device ${deviceId}`)
            setIsConnecting(true)
            eventSource = new EventSource(`/api/metrics/stream/${deviceId}`)
            activeConnections.set(deviceId, eventSource)

            eventSource.onopen = () => {
                const connectionTime = Date.now() - startTime;
                setIsConnecting(false)
                console.log('useDeviceMetrics', 'info', `[SSE] Connection established for device ${deviceId} in ${connectionTime}ms`)
                setError(null)
            }

            eventSource.onmessage = (event) => {
                try {
                    const parseStart = Date.now();
                    const data = JSON.parse(event.data)
                    const parseTime = Date.now() - parseStart;

                    if (parseTime > 100) {
                        console.log('useDeviceMetrics', 'warn', `[SSE] Slow message parsing for device ${deviceId}: ${parseTime}ms`);
                    }
                    metricsCache.set(deviceId, data)
                    setMetrics(data)
                } catch (err) {
                    console.log('useDeviceMetrics', 'error', `[SSE] Failed to parse metrics data for device ${deviceId}:`, err);
                    setError(new Error('Failed to parse metrics data'))
                }
            }

            eventSource.onerror = (err) => {
                console.log('useDeviceMetrics', 'error', `[SSE] Connection error for device ${deviceId}:`, err);
                setError(new Error('Failed to connect to metrics stream'))
                setIsConnecting(false)
                
                // Пробуем переподключиться через 5 секунд
                setTimeout(() => {
                    if (activeConnections.has(deviceId)) {
                        console.log('useDeviceMetrics', 'info', `[SSE] Attempting to reconnect for device ${deviceId}`);
                        eventSource?.close()
                        activeConnections.delete(deviceId)
                    }
                }, 5000)
            }

        }
        
        // Очистка при размонтировании компонента
        return () => {
            const subscribers = connectionSubscribers.get(deviceId) || 0
            if (subscribers <= 1) {
                // Если это последний подписчик, закрываем соединение
                console.log('useDeviceMetrics', 'info', `[SSE] Closing connection for device ${deviceId}, cleaning up resources`);
                eventSource?.close()
                activeConnections.delete(deviceId)
                connectionSubscribers.delete(deviceId)
            } else {
                // Иначе уменьшаем счетчик подписчиков
                console.log('useDeviceMetrics','info', `[SSE] Subscriber removed for device ${deviceId}, remaining subscribers: ${subscribers - 1}`);
                connectionSubscribers.set(deviceId, subscribers - 1)
            }
        }
    }, [deviceId])

    return { metrics, error, isConnecting }
}