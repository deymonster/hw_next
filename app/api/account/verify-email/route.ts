import { NextResponse } from 'next/server'

import { services } from '@/services/index'
import { LoggerService } from '@/services/logger/logger.interface'
import { Logger } from '@/services/logger/logger.service'

export async function GET(request: Request) {
	const logger = Logger.getInstance()
	await logger.info(LoggerService.AUTH_SERVICE, '[VERIFY_EMAIL_REQUEST]', {
		url: request.url
	})

	const url = new URL(request.url)
	const token = url.searchParams.get('token')

	if (!token) {
		await logger.warn(LoggerService.AUTH_SERVICE, '[TOKEN_MISSING]')
		return NextResponse.json(
			{ success: false, message: 'TOKEN_MISSING' },
			{ status: 400 }
		)
	}

	try {
		await logger.debug(
			LoggerService.AUTH_SERVICE,
			'[LOOKUP_USER_BY_TOKEN]',
			{ token }
		)
		const user = await services.data.user.getByToken(token)
		if (!user) {
			await logger.warn(LoggerService.AUTH_SERVICE, '[INVALID_TOKEN]', {
				token
			})
			return NextResponse.json(
				{ success: false, message: 'INVALID_TOKEN' },
				{ status: 400 }
			)
		}
		await logger.info(
			LoggerService.AUTH_SERVICE,
			'[VERIFY_EMAIL_UPDATE_START]',
			{ userId: user.id, email: user.email }
		)
		await services.data.user.update(user.id, {
			emailVerified: true,
			verificationToken: null
		})
		await logger.info(
			LoggerService.AUTH_SERVICE,
			'[EMAIL_VERIFICATION_SUCCESS]',
			{ userId: user.id }
		)

		return NextResponse.json(
			{ success: true, message: 'EMAIL_VERIFICATION_SUCCESS' },
			{ status: 200 }
		)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		await logger.error(
			LoggerService.AUTH_SERVICE,
			'[EMAIL_VERIFICATION_ERROR]',
			{ error: message }
		)
		return NextResponse.json(
			{ success: false, message: 'EMAIL_VERIFICATION_ERROR' },
			{ status: 500 }
		)
	}
}
