/**
 * Хук `useUser` объединяет серверные действия по управлению профилем:
 * изменение имени, почты, пароля и аватара с синхронизацией Zustand
 * и сессии NextAuth.
 */
import { useSession } from 'next-auth/react'
import { useCallback } from 'react'

import {
	confirmEmailChange,
	deleteUserAvatar,
	initiateEmailChange,
	updateUserAvatar,
	updateUserEmail,
	updateUserName,
	updateUserPassword,
	verifyEmailChangeCode
} from '@/app/actions/user'
import { authStore } from '@/store/auth/auth.store'
import { StoreUser } from '@/store/auth/auth.types'

interface CallbackOptions {
	onSuccess?: () => void
	onError?: (error: unknown) => void
}

export function useUser() {
	const { data: session, status, update: updateSession } = useSession()
	const store = authStore()
	const user = store.user
	const isAuthenticated = store.isAuthenticated

	const updateUserDataInStores = useCallback(
		async (userData: Partial<StoreUser>) => {
			if (!user) return false

			// Обновляем сессию Next.js
			await updateSession({
				user: {
					...session?.user,
					...userData
				}
			})

			// Обновляем хранилище Zustand
			// Важно: передаем полный объект StoreUser с обновленными полями
			store.setUser({
				id: user.id,
				email: user.email,
				role: user.role,
				name: userData.name !== undefined ? userData.name : user.name,
				image:
					userData.image !== undefined ? userData.image : user.image
			})

			return true
		},
		[user, session?.user, updateSession, store]
	)

	const initiateChangeEmail = useCallback(
		async (
			newEmail: string,
			{ onSuccess, onError }: CallbackOptions = {}
		) => {
			if (!user?.id || !user?.email) return false

			try {
				const success = await initiateEmailChange(
					user.id,
					user.email,
					newEmail
				)
				if (success) {
					onSuccess?.()
					return true
				}
				return false
			} catch (error) {
				console.error('[INITIATE_EMAIL_CHANGE_ERROR]', error)
				onError?.(error)
				return false
			}
		},
		[user?.id, user?.email]
	)

	const verifyEmailCode = useCallback(
		async (
			verificationCode: string,
			{ onSuccess, onError }: CallbackOptions = {}
		) => {
			if (!user?.id) return null

			try {
				const result = await verifyEmailChangeCode(
					user.id,
					verificationCode
				)
				if (result) {
					onSuccess?.()
					return result
				}
				return null
			} catch (error) {
				console.error('[VERIFY_EMAIL_CODE_ERROR]', error)
				onError?.(error)
				return null
			}
		},
		[user?.id]
	)

	const confirmEmailUpdate = useCallback(
		async ({ onSuccess, onError }: CallbackOptions = {}) => {
			if (!user?.id) return null

			try {
				const updatedUser = await confirmEmailChange(user.id)
				if (updatedUser) {
					// Используем общую функцию для обновления данных
					await updateUserDataInStores({
						email: updatedUser.email
					})
					onSuccess?.()
					return updatedUser
				}
				return null
			} catch (error) {
				console.error('[CONFIRM_EMAIL_CHANGE_ERROR]', error)
				onError?.(error)
				return null
			}
		},
		[user?.id, updateUserDataInStores]
	)

	const updatePassword = useCallback(
		async (
			oldPassword: string,
			newPassword: string,
			{ onSuccess, onError }: CallbackOptions = {}
		) => {
			if (!user?.id) return null

			try {
				const updatedUser = await updateUserPassword(
					user.id,
					oldPassword,
					newPassword
				)
				if (updatedUser) {
					onSuccess?.()
					return updatedUser
				}
				return null
			} catch (error) {
				console.error('[UPDATE_PASSWORD_ERROR]', error)
				onError?.(error)
				return null
			}
		},
		[user?.id]
	)

	const updateEmail = useCallback(
		async (email: string, { onSuccess, onError }: CallbackOptions = {}) => {
			if (!user?.id) return null

			try {
				const updatedUser = await updateUserEmail(user.id, email)
				if (updatedUser) {
					// Используем общую функцию для обновления данных
					await updateUserDataInStores({
						email: updatedUser.email
					})
					onSuccess?.()
					return updatedUser
				}
				return null
			} catch (error) {
				console.error('[UPDATE_EMAIL_ERROR]', error)
				onError?.(error)
				return null
			}
		},
		[user?.id, updateUserDataInStores]
	)

	const updateName = useCallback(
		async (name: string, { onSuccess, onError }: CallbackOptions = {}) => {
			if (!user?.id) return null
			try {
				const updatedUser = await updateUserName(user.id, name)
				if (updatedUser) {
					// Используем общую функцию для обновления данных
					await updateUserDataInStores({
						name: updatedUser.name
					})
					onSuccess?.()
					return updatedUser
				}
				return null
			} catch (error) {
				console.error('[UPDATE_NAME_ERROR]', error)
				onError?.(error)
				return null
			}
		},
		[user?.id, updateUserDataInStores]
	)

	const updateAvatar = useCallback(
		async (file: File, { onSuccess, onError }: CallbackOptions = {}) => {
			if (!user?.id) return null

			try {
				const updatedUser = await updateUserAvatar(user.id, file)
				if (updatedUser) {
					// Используем общую функцию для обновления данных
					await updateUserDataInStores({
						image: updatedUser.image
					})
					onSuccess?.()
					return updatedUser
				}
				return null
			} catch (error) {
				console.error('[UPDATE_AVATAR_ERROR]', error)
				onError?.(error)
				return null
			}
		},
		[user?.id, updateUserDataInStores]
	)

	const deleteAvatar = useCallback(
		async ({ onSuccess, onError }: CallbackOptions = {}) => {
			if (!user?.id) return null

			try {
				const updatedUser = await deleteUserAvatar(user.id)
				if (updatedUser) {
					// Используем общую функцию для обновления данных
					await updateUserDataInStores({
						image: null
					})
					onSuccess?.()
					return updatedUser
				}
				return null
			} catch (error) {
				console.error('[DELETE_AVATAR_ERROR]', error)
				onError?.(error)
				return null
			}
		},
		[user?.id, updateUserDataInStores]
	)

	return {
		user,
		loading: status === 'loading',
		isAuthenticated,
		updateAvatar,
		deleteAvatar,
		updateName,
		updateEmail,
		initiateChangeEmail,
		verifyEmailCode,
		confirmEmailUpdate,
		updatePassword,
		updateSession
	}
}
