/**
 * Хук `useDeviceMetrics` устанавливает SSE-подписку для устройства,
 * кеширует полученные метрики и управляет совместным использованием
 * соединений между компонентами.
 */
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

		let currentMetrics: DeviceMetrics = (metricsCache.get(deviceId) ||
			{}) as DeviceMetrics

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
				console.log('[SSE] connection opened for', deviceId)
			}

			eventSource.onmessage = event => {
				try {
					const response: MetricsResponse = JSON.parse(event.data)
					console.log('[SSE] message type:', response.type)

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
						case 'error':
							console.warn(
								'[SSE] static data error:',
								response.data
							)
							break
						case 'system':
							// можем показывать индикатор ожидания статики
							// напр.: response.data.status === 'waiting_static'
							break
					}

					// ВАЖНО: обновляем состояние даже при частичных данных
					metricsCache.set(deviceId, currentMetrics)
					setMetrics({ ...(currentMetrics as DeviceMetrics) })
				} catch (err) {
					console.error('[SSE] parse error:', err)
					setError(new Error('Failed to parse metrics data'))
				}
			}

			eventSource.onerror = err => {
				console.warn('[SSE] onerror for', deviceId, err)
				setIsConnecting(false)
				// Не закрываем сразу — EventSource автоматически реконнектится
				// Если длительное время нет onopen — сбросим соединение
				setTimeout(() => {
					const es = activeConnections.get(deviceId)
					if (es && es.readyState === EventSource.CLOSED) {
						try {
							es.close()
						} catch {}
						activeConnections.delete(deviceId)
					}
				}, 10000)
			}
		}

		// Очистка при размонтировании компонента
		return () => {
			const subscribers = connectionSubscribers.get(deviceId) || 0
			if (subscribers <= 1) {
				try {
					eventSource?.close()
				} catch {}
				activeConnections.delete(deviceId)
				connectionSubscribers.delete(deviceId)
			} else {
				connectionSubscribers.set(deviceId, subscribers - 1)
			}
		}
	}, [deviceId])

	return { metrics, error, isConnecting }
}
