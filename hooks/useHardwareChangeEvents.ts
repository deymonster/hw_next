/**
 * Хук `useHardwareChangeEvents` отслеживает неподтверждённые события
 * изменения оборудования для конкретного устройства, поддерживая
 * автоматическое обновление и ручное перезапрос данных.
 */
import { Event } from '@prisma/client'
import { useCallback, useEffect, useState } from 'react'

import { getUnconfirmedHardwareChangeEvents } from '@/app/actions/event'

interface CallbackOptions {
	onSuccess?: () => void
	onError?: (error: unknown) => void
}

interface UseHardwareChangeEventsResult {
	events: Event[]
	hasUnconfirmedEvents: boolean
	loading: boolean
	error: string | null
	refetch: () => Promise<void>
}

export function useHardwareChangeEvents(
	deviceId: string,
	autoRefresh = true,
	refreshInterval = 30000 // 30 секунд
): UseHardwareChangeEventsResult {
	const [events, setEvents] = useState<Event[]>([])
	const [loading, setLoading] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)

	// Получение неподтвержденных событий смены оборудования
	const fetchUnconfirmedEvents = useCallback(
		async ({ onSuccess, onError }: CallbackOptions = {}) => {
			if (!deviceId) {
				setEvents([])
				return
			}

			try {
				setLoading(true)
				setError(null)
				const result =
					await getUnconfirmedHardwareChangeEvents(deviceId)

				if (result.error) {
					setError(result.error)
					onError?.(new Error(result.error))
					return
				}

				setEvents(result.events || [])
				onSuccess?.()
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error'
				setError(errorMessage)
				onError?.(error)
				console.error(
					'[FETCH_UNCONFIRMED_HARDWARE_EVENTS_ERROR]',
					error
				)
			} finally {
				setLoading(false)
			}
		},
		[deviceId]
	)

	// Публичный метод для принудительного обновления
	const refetch = useCallback(async () => {
		await fetchUnconfirmedEvents()
	}, [fetchUnconfirmedEvents])

	// Автоматическое получение событий при изменении deviceId
	useEffect(() => {
		if (!deviceId) {
			setEvents([])
			setError(null)
			return
		}

		// Получаем события при загрузке
		fetchUnconfirmedEvents()
	}, [deviceId, fetchUnconfirmedEvents])

	// Автоматическое обновление с интервалом
	useEffect(() => {
		if (!autoRefresh || !deviceId) return

		const interval = setInterval(() => {
			fetchUnconfirmedEvents()
		}, refreshInterval)

		return () => clearInterval(interval)
	}, [autoRefresh, deviceId, refreshInterval, fetchUnconfirmedEvents])

	// Вычисляемое свойство для проверки наличия неподтвержденных событий
	const hasUnconfirmedEvents = events.length > 0

	return {
		events,
		hasUnconfirmedEvents,
		loading,
		error,
		refetch
	}
}
