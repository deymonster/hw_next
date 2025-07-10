import { signOut as nextAuthSignOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { authenticate, getCurrentUser } from '@/app/actions/auth'
import { authStore } from '@/store/auth/auth.store'
import { StoreUser } from '@/store/auth/auth.types'

export function useAuth(): {
	isAuthenticated: boolean
	user: StoreUser | null
	loading: boolean
	auth: () => void
	exit: () => Promise<void>
	login: (
		email: string,
		password: string,
		callbackUrl?: string
	) => Promise<{ success: boolean; error?: string; callbackUrl?: string }>
	getUser: (
		forceRefetch?: boolean
	) => Promise<{ user: StoreUser | null; error: string | null }>
} {
	const { data: session, status } = useSession()
	const store = authStore()
	const router = useRouter()

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
			// Очищаем клиентское состояние
			console.log('[useAuth] Clearing client store')
			store.clear()
			console.log('[useAuth] Client store cleared')

			await nextAuthSignOut({
				redirect: true,
				redirectTo: '/'
			})
		} catch (error) {
			console.error('Logout error:', error)
			throw error
		}
	}

	const login = async (
		email: string,
		password: string,
		callbackUrl?: string
	) => {
		try {
			console.log('[useAuth] Login attempt for:', email)
			const formData = new FormData()
			formData.append('email', email)
			formData.append('password', password)

			console.log(
				'[useAuth] Calling authenticate with callbackUrl:',
				callbackUrl
			)
			const result = await authenticate(callbackUrl, formData)

			if ('error' in result) {
				return { success: false, error: result.error }
			}
			if (result.success) {
				console.log('[useAuth] Authentication successful')
				auth() // Устанавливает только флаг isAuthenticated

				console.log('[useAuth] Getting user data')
				// Получаем данные пользователя и сразу устанавливаем их в store
				const userData = await getUser(true)
				if (userData.user) {
					store.setUser(userData.user)
					console.log(
						'[useAuth] User data set in store:',
						userData.user
					)
				} else {
					console.log(
						'[useAuth] Failed to get user data:',
						userData.error
					)
				}

				if (result.callbackUrl) {
					console.log('[useAuth] Redirecting to:', result.callbackUrl)
					// Добавляем параметр refresh=true к URL для принудительного обновления
					const url = new URL(
						result.callbackUrl,
						window.location.origin
					)
					url.searchParams.set('refresh', 'true')
					setTimeout(() => {
						router.push(url.toString())
					}, 100)
				}
			}

			return { success: result.success, callbackUrl: result.callbackUrl }
		} catch (error) {
			console.error('Login error:', error)
			return { success: false, error: 'AUTHENTICATION_FAILED' }
		}
	}

	const getUser = async (forceRefetch = false) => {
		try {
			const result = await getCurrentUser(forceRefetch)
			if (result.user) {
				const storeUser: StoreUser = {
					id: result.user.id,
					email: result.user.email,
					name: result.user.name ?? null,
					image: result.user.image ?? null,
					role: result.user.role
				}
				return { user: storeUser, error: null }
			}
			return { user: null, error: result.error }
		} catch (error) {
			console.error('Get user error:', error)
			return { user: null, error: 'Failed to get user data' }
		}
	}

	return {
		isAuthenticated: store.isAuthenticated,
		user: store.user,
		loading: status === 'loading',
		auth,
		exit,
		login,
		getUser
	}
}
