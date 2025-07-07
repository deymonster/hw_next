import { signOut as nextAuthSignOut, useSession } from 'next-auth/react'
import { useEffect } from 'react'

import { clearSession } from '@/app/actions/auth'
import { authStore } from '@/store/auth/auth.store'
import { StoreUser } from '@/store/auth/auth.types'

export function useAuth(): {
	isAuthenticated: boolean
	user: StoreUser | null
	loading: boolean
	auth: () => void
	exit: () => Promise<void>
} {
	const { data: session, status } = useSession()
	const store = authStore()

	useEffect(() => {
		if (session?.user && session.user.email && session.user.id) {
			store.setIsAuthenticated(true)
			const storeUser: StoreUser = {
				id: session.user.id,
				email: session.user.email,
				name: session.user.name ?? null,
				image: session.user.image ?? null,
				role: session.user.role
			}
			store.setUser(storeUser)
		} else if (status === 'unauthenticated') {
			store.clear()
		}
	}, [session, status])

	const auth = () => store.setIsAuthenticated(true)

	const exit = async () => {
		try {
			// Очищаем серверную сессию
			await clearSession()

			// Очищаем клиентское состояние
			store.clear()
		} catch (error) {
			console.error('Logout error:', error)
			throw error
		}
	}

	return {
		isAuthenticated: store.isAuthenticated,
		user: store.user,
		loading: status === 'loading',
		auth,
		exit
	}
}
