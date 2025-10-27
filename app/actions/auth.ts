'use server'

import { EventSeverity, EventType } from '@prisma/client'

import { TypeCreateAccountSchema } from '@/schemas/auth/create-account.schema'
import { TypeNewPasswordSchema } from '@/schemas/auth/new-password.schema'
import { TypeResetPasswordSchema } from '@/schemas/auth/reset-password.shema'

import { logAuditEvent } from './utils/audit-events'

import { auth, signIn, signOut } from '@/auth'
import { AUTH_ERRORS } from '@/libs/auth/constants'
import { CustomUser } from '@/libs/auth/types'
import { services } from '@/services/index'

export async function updatePasswordWithToken(
	token: string,
	data: TypeNewPasswordSchema
) {
	try {
		// 1. Проверяем токен на валидность
		const userId = await services.data.user.verifyResetToken(token)
		if (!userId) {
			return { error: AUTH_ERRORS.INVALID_TOKEN }
		}
		// 2. Обновляем пароль пользователя
		await services.data.user.updatePassword(userId, data.password)

		await logAuditEvent({
			type: EventType.USER,
			severity: EventSeverity.HIGH,
			title: 'Смена пароля',
			message:
				'Пароль учетной записи был изменен через ссылку восстановления.',
			userId
		})

		return { success: true, message: 'Пароль успешно обновлен' }
	} catch (error) {
		console.error('[UPDATE_PASSWORD_ACTION_ERROR]', error)
		return { error: AUTH_ERRORS.UPDATE_PASSWORD_FAILED }
	}
}

export async function resetPassword(data: TypeResetPasswordSchema) {
	try {
		const { email } = data
		// 1. Находим пользователя по email
		const user = await services.data.user.getByEmail(email)
		if (!user) {
			return { error: AUTH_ERRORS.USER_NOT_FOUND }
		}

		// 2. Создаем токен для сброса пароля
		const resetToken = await services.data.user.createResetToken(user.id)

		// 3. Отправляем письмо с ссылкой для сброса пароля
		await services.data.user.sendPasswordResetEmail(email, resetToken)

		return {
			success: true,
			message:
				'Письмо с инструкцией по сбросу пароля отправлено на ваш email'
		}
	} catch (error) {
		console.error('[RESET_PASSWORD_ACTION_ERROR]', error)
		return { error: AUTH_ERRORS.RESET_PASSWORD_FAILED }
	}
}

export async function createUser(data: TypeCreateAccountSchema) {
	try {
		const userData = {
			...data,
			name: data.username // преобразование username в name
		}
		const result = await services.data.user.createUser(userData)
		if ('error' in result) {
			return { error: result.error }
		}
		return { success: true, user: result.user }
	} catch (error) {
		console.error('[CREATE_USER_ACTION_ERROR]', error)
		return { error: AUTH_ERRORS.CREATE_USER_FAILED }
	}
}

export async function authenticate(
	prevState: string | undefined,
	formData: FormData
) {
	try {
		const callbackUrl = prevState || '/dashboard/settings'

		await signIn('credentials', {
			email: formData.get('email'),
			password: formData.get('password'),
			redirect: false,
			callbackUrl
		})

		return { success: true, callbackUrl }
	} catch (error: unknown) {
		// Получаем сообщение из вложенной ошибки
		if (
			error &&
			typeof error === 'object' &&
			'cause' in error &&
			error.cause &&
			typeof error.cause === 'object' &&
			'err' in error.cause &&
			error.cause.err &&
			typeof error.cause.err === 'object' &&
			'message' in error.cause.err
		) {
			return { error: error.cause.err.message as string }
		}

		return { error: 'AUTHENTICATION_FAILED' }
	}
}

// Тип для возвращаемого значения getCurrentUser
type GetCurrentUserReturn = {
	user: CustomUser | null
	error: string | null
	loading: boolean
}

// Получение данных текущего пользователя
export async function getCurrentUser(
	forceRefetch = false
): Promise<GetCurrentUserReturn> {
	try {
		const session = await auth()

		if (!session?.user?.id) {
			return {
				user: null,
				error: 'Token not found',
				loading: false
			}
		}

		// Если не нужно обновлять данные из БД, возвращаем данные из сессии
		if (!forceRefetch) {
			const customUser: CustomUser = {
				id: session.user.id as string, // Здесь мы уверены, что id существует, т.к. проверили выше
				email: session.user.email as string,
				role: session.user.role,
				name: session.user.name,
				image: session.user.image,
				sessionId: session.user.sessionId
			}
			return {
				user: customUser,
				error: null,
				loading: false
			}
		}

		// Получаем актуальные данные из БД
		try {
			const user = await services.data.user.findById(session.user.id)

			if (!user) {
				return {
					user: null,
					error: 'User not found',
					loading: false
				}
			}

			const customUser: CustomUser = {
				id: user.id,
				email: user.email,
				role: user.role,
				name: user.name,
				image: user.image,
				sessionId: session.user.sessionId
			}

			// Возвращаем данные из БД
			return {
				user: customUser,
				error: null,
				loading: false
			}
		} catch (error) {
			return {
				user: null,
				error:
					error instanceof Error
						? error.message
						: 'Failed to fetch user data from DB',
				loading: false
			}
		}
	} catch (error) {
		return {
			user: null,
			error:
				error instanceof Error
					? error.message
					: 'Failed to get session',
			loading: false
		}
	}
}

export async function logout() {
	await signOut()
}
