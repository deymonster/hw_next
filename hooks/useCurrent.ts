import { User } from '@prisma/client'
import { useEffect, useState } from 'react'

import { useAuth } from './useAuth'

import { clearSession, getCurrentUser } from '@/app/actions/auth'

export function useCurrent() {
	const { isAuthenticated, exit } = useAuth()
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [user, setUser] = useState<User | null>(null)

	const fetchUser = async (forceRefetch = false) => {
		if (!isAuthenticated) {
			setUser(null)
			setError(null)
			return
		}

		try {
			setLoading(true)
			const result = await getCurrentUser(forceRefetch)

			if (result.error) {
				setError(result.error)
				setUser(null)
				// Если произошла ошибка при получении данных пользователя,
				// удаляем сессию и выходим
				if (result.error === 'Token not found') {
					await clearSession()
					exit()
				}

				return
			}

			setUser(result.user)
			setError(null)
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to fetch user data'
			)
			setUser(null)
			await clearSession()
			exit()
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		if (isAuthenticated) {
			fetchUser()
		} else {
			setUser(null)
		}
	}, [isAuthenticated])

	return {
		user,
		loading,
		error,
		refetch: () => fetchUser(true)
	}
}
