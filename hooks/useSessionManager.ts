/**
 * Хук `useSessionManager` управляет сессиями пользователя: загружает активные
 * подключения, определяет текущую сессию и позволяет завершать отдельные
 * сеансы с учётом ошибок и состояния загрузки.
 */
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'

import type { UserSession } from '@/services/redis/types'

interface RemoveSessionOptions {
	onSuccess?: () => void
	onError?: (error: unknown) => void
}

export function useSessionManager() {
	const { data: session } = useSession()
	const [sessions, setSessions] = useState<UserSession[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (session?.user?.id) {
			fetchSessions()
		}
	}, [session?.user?.id])

	const getCurrentSession = () => {
		if (!session?.user?.sessionId || !sessions.length) return null
		return sessions.find(s => s.sessionId === session?.user?.sessionId)
	}

	const fetchSessions = useCallback(async () => {
		try {
			if (!session?.user?.id) return
			setLoading(true)
			setError(null)
			const response = await fetch('/api/auth/session-check/sessions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ userId: session.user.id })
			})

			if (!response.ok) throw new Error('Failed to fetch sessions')
			const data = await response.json()
			setSessions(data)
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to fetch sessions'
			)
		} finally {
			setLoading(false)
		}
	}, [session?.user?.id])

	const removeSession = useCallback(
		async (sessionId: string, options?: RemoveSessionOptions) => {
			try {
				if (!session?.user?.id) return null
				setError(null)
				const response = await fetch('/api/auth/session-check/delete', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ userId: session.user.id, sessionId })
				})

				if (!response.ok) throw new Error('Failed to remove session')

				setSessions(prev => prev.filter(s => s.sessionId !== sessionId))
				await fetchSessions()
				options?.onSuccess?.()
				return true
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: 'Failed to remove session'
				)
				options?.onError?.(err)
				return false
			}
		},
		[session?.user?.id, fetchSessions]
	)

	return {
		sessions,
		loading,
		error,
		fetchSessions,
		removeSession,
		getCurrentSession
	}
}
