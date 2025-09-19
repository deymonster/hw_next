import { useCallback, useEffect, useState } from 'react'

import {
	findAllEvents,
	findAndMarkAllAsRead,
	findUnreadEvents,
	getUnreadEventCount,
	markEventAsRead
} from '@/app/actions/event'
import { useCurrentSession } from '@/hooks/useCurrentSession'
import { EventWithDevice } from '@/services/event.interfaces'

interface CallbackOptions {
	onSuccess?: () => void
	onError?: (error: unknown) => void
}

interface EventsOptions {
	take?: number
	skip?: number
	orderBy?: string
	orderDir?: 'asc' | 'desc'
}

interface EventsResult {
	events: EventWithDevice[]
	total: number
	error?: string
}

export function useEvents() {
	const { user } = useCurrentSession()
	const [unreadCount, setUnreadCount] = useState<number>(0)
	const [loading, setLoading] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)

	// Получение количества непрочитанных событий
	const fetchUnreadCount = useCallback(
		async ({ onSuccess, onError }: CallbackOptions = {}) => {
			if (!user?.id) return 0

			try {
				const count = await getUnreadEventCount(user.id)
				setUnreadCount(count)
				onSuccess?.()
				return count
			} catch (error) {
				console.error('[FETCH_UNREAD_COUNT_ERROR]', error)
				onError?.(error)
				return 0
			}
		},
		[user?.id]
	)

	// Получение непрочитанных событий
	const fetchUnreadEvents = useCallback(
		async ({ onSuccess, onError }: CallbackOptions = {}): Promise<{
			events: EventWithDevice[]
			error?: string
		}> => {
			if (!user?.id)
				return { events: [], error: 'User not authenticated' }

			try {
				setLoading(true)
				setError(null)
				const result = await findUnreadEvents(user.id)

				if (result.error) {
					setError(result.error)
					onError?.(new Error(result.error))
					return { events: [], error: result.error }
				}

				onSuccess?.()
				return { events: result.events || [], error: undefined }
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error'
				setError(errorMessage)
				onError?.(error)
				return { events: [], error: errorMessage }
			} finally {
				setLoading(false)
			}
		},
		[user?.id]
	)

	// Получение и отметка всех событий как прочитанных
	const fetchAndMarkAllAsRead = useCallback(
		async ({ onSuccess, onError }: CallbackOptions = {}): Promise<{
			events: EventWithDevice[]
			unreadCount: number
			error?: string
		}> => {
			if (!user?.id)
				return {
					events: [],
					unreadCount: 0,
					error: 'User not authenticated'
				}

			try {
				setLoading(true)
				setError(null)
				const result = await findAndMarkAllAsRead(user.id)

				if (result.error) {
					setError(result.error)
					onError?.(new Error(result.error))
					return { events: [], unreadCount: 0, error: result.error }
				}

				// Обновляем счетчик непрочитанных
				setUnreadCount(0)
				onSuccess?.()
				return {
					events: result.events || [],
					unreadCount: result.unreadCount || 0,
					error: undefined
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error'
				setError(errorMessage)
				onError?.(error)
				return { events: [], unreadCount: 0, error: errorMessage }
			} finally {
				setLoading(false)
			}
		},
		[user?.id]
	)

	// Получение всех событий с пагинацией
	const fetchAllEvents = useCallback(
		async (
			options?: EventsOptions,
			{ onSuccess, onError }: CallbackOptions = {}
		): Promise<EventsResult> => {
			if (!user?.id)
				return { events: [], total: 0, error: 'User not authenticated' }

			try {
				setLoading(true)
				setError(null)
				const result = await findAllEvents(user.id, options)

				if (result.error) {
					setError(result.error)
					onError?.(new Error(result.error))
					return { events: [], total: 0, error: result.error }
				}

				onSuccess?.()
				return {
					events: result.events || [],
					total: result.total || 0,
					error: undefined
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error'
				setError(errorMessage)
				onError?.(error)
				return { events: [], total: 0, error: errorMessage }
			} finally {
				setLoading(false)
			}
		},
		[user?.id]
	)

	// Отметка отдельного события как прочитанного
	const markAsRead = useCallback(
		async (
			eventId: string,
			{ onSuccess, onError }: CallbackOptions = {}
		) => {
			if (!eventId) return { event: null, error: 'Event ID is required' }

			try {
				setLoading(true)
				setError(null)
				const result = await markEventAsRead(eventId)

				if (result.error) {
					setError(result.error)
					onError?.(new Error(result.error))
					return { event: null, error: result.error }
				}

				// Обновляем счетчик непрочитанных, если событие было непрочитанным
				if (result.event && !result.event.isRead) {
					fetchUnreadCount()
				}

				onSuccess?.()
				return { event: result.event, error: undefined }
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error'
				setError(errorMessage)
				onError?.(error)
				return { event: null, error: errorMessage }
			} finally {
				setLoading(false)
			}
		},
		[fetchUnreadCount]
	)

	// Автоматическое обновление счетчика непрочитанных событий
	useEffect(() => {
		if (!user?.id) return

		// Получаем количество непрочитанных при загрузке
		fetchUnreadCount()

		// Устанавливаем интервал для периодического обновления
		const interval = setInterval(() => fetchUnreadCount(), 30000) // Обновляем каждые 30 секунд

		return () => clearInterval(interval)
	}, [user?.id, fetchUnreadCount])

	return {
		unreadCount,
		loading,
		error,
		fetchUnreadCount,
		fetchUnreadEvents,
		fetchAndMarkAllAsRead,
		fetchAllEvents,
		markAsRead
	}
}
