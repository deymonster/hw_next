import { NextResponse } from 'next/server'

import { services } from '@/services/index'

export async function GET(request: Request) {
	const url = new URL(request.url)
	const token = url.searchParams.get('token')

	if (!token) {
		return NextResponse.json(
			{ success: false, message: 'TOKEN_MISSING' },
			{ status: 400 }
		)
	}

	try {
		const user = await services.data.user.getByToken(token)
		if (!user) {
			return NextResponse.json(
				{ success: false, message: 'INVALID_TOKEN' },
				{ status: 400 }
			)
		}
		await services.data.user.update(user.id, {
			emailVerified: true,
			verificationToken: null
		})

		return NextResponse.json(
			{ success: true, message: 'EMAIL_VERIFICATION_SUCCESS' },
			{ status: 200 }
		)
	} catch (error) {
		console.error('Error verifying email:', error)
		return NextResponse.json(
			{ success: false, message: 'EMAIL_VERIFICATION_ERROR' },
			{ status: 500 }
		)
	}
}
