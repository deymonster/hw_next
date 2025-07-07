import { useEffect, useState } from 'react'

import {
	DeviceMetrics,
	MetricsResponse
} from '@/services/prometheus/prometheus.interfaces'

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
	const [metrics, setMetrics] = useState<DeviceMetrics | null>(
		() => metricsCache.get(deviceId) || null
	)
	const [error, setError] = useState<Error | null>(null)
	const [isConnecting, setIsConnecting] = useState(false)

	useEffect(() => {
		if (!deviceId) return

		let currentMetrics: DeviceMetrics = {} as DeviceMetrics

		// Увеличиваем счетчик подписчиков
		const currentSubscribers = connectionSubscribers.get(deviceId) || 0
		connectionSubscribers.set(deviceId, currentSubscribers + 1)

		// Проверяем существующее соединение
		let eventSource = activeConnections.get(deviceId)

		if (!eventSource) {
			setIsConnecting(true)
			eventSource = new EventSource(`/api/metrics/stream/${deviceId}`)
			activeConnections.set(deviceId, eventSource)

			eventSource.onopen = () => {
				setIsConnecting(false)
				setError(null)
			}

			eventSource.onmessage = event => {
				try {
					const response: MetricsResponse = JSON.parse(event.data)
					console.log('SSE Message Type:', response.type)

					switch (response.type) {
						case 'static':
							currentMetrics = {
								...currentMetrics,
								systemInfo: response.data.systemInfo,
								hardwareInfo: response.data.hardwareInfo
							}
							break
						case 'dynamic':
							currentMetrics = {
								...currentMetrics,
								processorMetrics:
									response.data.processorMetrics,
								diskMetrics: response.data.diskMetrics,
								memoryMetrics: response.data.memoryMetrics,
								networkMetrics: response.data.networkMetrics
							}
							break
					}
					if (
						currentMetrics.systemInfo &&
						currentMetrics.hardwareInfo
					) {
						metricsCache.set(deviceId, currentMetrics)
						setMetrics(currentMetrics)
					}
				} catch (err) {
					setError(new Error('Failed to parse metrics data'))
				}
			}

			eventSource.onerror = err => {
				setError(new Error('Failed to connect to metrics stream'))
				setIsConnecting(false)

				// Пробуем переподключиться через 5 секунд
				setTimeout(() => {
					if (activeConnections.has(deviceId)) {
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

				eventSource?.close()
				activeConnections.delete(deviceId)
				connectionSubscribers.delete(deviceId)
			} else {
				// Иначе уменьшаем счетчик подписчиков

				connectionSubscribers.set(deviceId, subscribers - 1)
			}
		}
	}, [deviceId])

	return { metrics, error, isConnecting }
}
