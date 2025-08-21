import { useEffect, useRef, useState } from 'react'

import { ProcessListInfo } from '@/services/prometheus/prometheus.interfaces'

export interface ProcessListData extends ProcessListInfo {}

interface ProcessMetricsState {
	isLoading: boolean
	isConnected: boolean
	error: string | null
	data: ProcessListData | null
	lastUpdated: number | null
}

const clearWebSocketUrl = (deviceId: string) => {
	webSocketUrls.delete(deviceId)
}

// Глобальное хранилище для WebSocket URL по deviceId
const webSocketUrls = new Map<string, string>()

// Константы для переподключения
const RECONNECT_TIMEOUT = 5000
const ERROR_RECONNECT_TIMEOUT = 10000

/**
 * Хук для получения метрик процессов через WebSocket
 * @param deviceId ID устройства для мониторинга
 * @returns Состояние соединения и данные о процессах
 */
export function useProcessMetrics(deviceId: string) {
	const [state, setState] = useState<ProcessMetricsState>({
		isLoading: true,
		isConnected: false,
		error: null,
		data: null,
		lastUpdated: null
	})

	const wsRef = useRef<WebSocket | null>(null)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const initializingRef = useRef<boolean>(false)

	// Функция для закрытия WebSocket соединения
	const closeWebSocket = () => {
		if (wsRef.current) {
			try {
				// Set onclose to null to prevent reconnection attempt
				wsRef.current.onopen = null
				wsRef.current.onmessage = null
				wsRef.current.onerror = null
				wsRef.current.onclose = null
				wsRef.current.close()
			} catch (error) {
				console.error('Error closing websocket:', error)
			}
			wsRef.current = null
			setState(prev => ({
				...prev,
				isConnected: false,
				isLoading: false,
				error: null,
				data: null
			}))
		}
	}

	// Инициализация WebSocket соединения
	const initializeWebSocket = async () => {
		if (initializingRef.current) return

		initializingRef.current = true
		closeWebSocket()

		try {
			// Проверяем, есть ли уже URL для этого устройства
			let wsUrl = webSocketUrls.get(deviceId)

			// Если URL нет, делаем HTTP запрос для инициализации
			if (!wsUrl) {
				setState(prev => ({ ...prev, isLoading: true, error: null }))

				try {
					const response = await fetch(
						`/api/metrics/processes/${deviceId}`
					)

					if (!response.ok) {
						const errorData = await response.json()
						throw new Error(
							errorData.error ||
								'Failed to initialize WebSocket server'
						)
					}

					const data = await response.json()
					wsUrl = data.connection

					if (!wsUrl) {
						throw new Error('WebSocket URL is undefined')
					}
					// Сохраняем URL для повторного использования
					webSocketUrls.set(deviceId, wsUrl)
				} catch (error) {
					setState(prev => ({
						...prev,
						error:
							error instanceof Error
								? error.message
								: 'Failed to connect to server',
						isLoading: false,
						isConnected: false
					}))
					initializingRef.current = false
					clearWebSocketUrl(deviceId)
					return
				}
			}

			// Создаем новое WebSocket соединение
			const ws = new WebSocket(wsUrl)
			wsRef.current = ws

			// Обработчик успешного подключения
			ws.onopen = () => {
				setState(prev => ({
					...prev,
					isConnected: true,
					isLoading: false,
					error: null
				}))
				initializingRef.current = false
			}

			// Обработчик получения данных
			ws.onmessage = event => {
				try {
					const data = JSON.parse(event.data)
					if (data.error) {
						setState(prev => ({
							...prev,
							error: data.error,
							isLoading: false
						}))
						clearWebSocketUrl(deviceId)
						return
					}

					// Проверяем, что data содержит processes и это массив
					if (!data.processes || !Array.isArray(data.processes)) {
						data.processes = []
					}

					setState(prev => ({
						...prev,
						data,
						lastUpdated: Date.now(),
						isLoading: false,
						error: null
					}))
				} catch (error) {
					console.error('Error parsing WebSocket message:', error)
					setState(prev => ({
						...prev,
						error: 'Invalid data received',
						isLoading: false
					}))
				}
			}

			// Обработчик ошибок соединения
			ws.onerror = error => {
				console.error('WebSocket error:', error)
				setState(prev => ({
					...prev,
					error: 'WebSocket connection error',
					isConnected: false
				}))
				clearWebSocketUrl(deviceId)
			}

			// Обработчик закрытия соединения
			ws.onclose = () => {
				setState(prev => ({
					...prev,
					isConnected: false,
					isLoading: false
				}))

				// Пытаемся переподключиться через 5 секунд
				if (reconnectTimeoutRef.current) {
					clearTimeout(reconnectTimeoutRef.current)
				}

				// Планируем переподключение
				reconnectTimeoutRef.current = setTimeout(() => {
					if (document.visibilityState !== 'hidden') {
						clearWebSocketUrl(deviceId) // Очищаем URL перед переподключением
						initializeWebSocket()
					}
				}, RECONNECT_TIMEOUT)
			}
		} catch (error) {
			console.error('Failed to initialize WebSocket:', error)
			setState(prev => ({
				...prev,
				error: error instanceof Error ? error.message : 'Unknown error',
				isLoading: false,
				isConnected: false
			}))
			initializingRef.current = false
			clearWebSocketUrl(deviceId)

			// Планируем переподключение при ошибке
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
			}

			reconnectTimeoutRef.current = setTimeout(() => {
				if (document.visibilityState !== 'hidden') {
					initializeWebSocket()
				}
			}, ERROR_RECONNECT_TIMEOUT)
		}
	}

	// Инициализация соединения при монтировании компонента
	useEffect(() => {
		if (deviceId) {
			initializeWebSocket()
		}

		// Переподключение при возвращении на вкладку
		const handleVisibilityChange = () => {
			if (
				document.visibilityState === 'visible' &&
				(!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
			) {
				clearWebSocketUrl(deviceId)
				initializeWebSocket()
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)

		// Очистка при размонтировании
		return () => {
			document.removeEventListener(
				'visibilitychange',
				handleVisibilityChange
			)
			closeWebSocket()

			if (wsRef.current) {
				wsRef.current.close()
				wsRef.current = null
			}

			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
				reconnectTimeoutRef.current = null
			}
			clearWebSocketUrl(deviceId)
			initializingRef.current = false
		}
	}, [deviceId])

	// Функция для принудительного переподключения
	const reconnect = () => {
		closeWebSocket() // Сначала закрываем текущее соединение
		clearWebSocketUrl(deviceId)
		setState(prev => ({ ...prev, isLoading: true, error: null }))
		initializeWebSocket()
	}

	return {
		...state,
		reconnect
	}
}
