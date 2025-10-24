/**
 * Хук `useCurrentSession` предоставляет удобный доступ к данным текущей
 * сессии NextAuth, возвращая пользователя, статус загрузки и признак
 * успешной аутентификации.
 */
import { useSession } from 'next-auth/react'

export function useCurrentSession() {
	const { data: session, status } = useSession()

	const user = session?.user || null
	const loading = status === 'loading'
	const isAuthenticated = status === 'authenticated'

	return { user, loading, isAuthenticated }
}
