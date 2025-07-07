import { getToken } from 'next-auth/jwt'
import { type NextRequest, NextResponse } from 'next/server'

import { AUTH_ROUTES } from './libs/auth/constants'

function createRedirectUrl(
	baseUrl: string,
	from: string,
	request: NextRequest
) {
	const url = new URL(
		`${AUTH_ROUTES.SIGN_IN}?from=${encodeURIComponent(from)}`,
		request.url
	)
	url.searchParams.set('refresh', 'true')
	return url
}

export default async function middleware(request: NextRequest) {
	const token = await getToken({
		req: request,
		secret: process.env.NEXTAUTH_SECRET,
		cookieName: 'authjs.session-token',
		secureCookie: process.env.NODE_ENV === 'production'
	})

	// Проверяем Redis сессию если есть токен
	if (token?.id && token?.sessionId) {
		try {
			const response = await fetch(
				`${request.nextUrl.origin}/api/auth/session-check`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ sessionId: token.sessionId })
				}
			)

			const data = await response.json()

			if (!response.ok || !data || !data.valid) {
				await fetch(
					`${request.nextUrl.origin}/api/auth/session-check/delete`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							userId: token.id,
							sessionId: token.sessionId
						})
					}
				)

				const response = NextResponse.redirect(
					createRedirectUrl(AUTH_ROUTES.SIGN_IN, request.url, request)
				)
				response.cookies.delete('authjs.session-token')
				response.cookies.delete('__Secure-authjs.session-token')
				return response
			}
		} catch (error) {
			console.error('Session check error:', error)
			// При ошибке тоже делаем редирект
			return NextResponse.redirect(
				createRedirectUrl(AUTH_ROUTES.SIGN_IN, request.url, request)
			)
		}
	}

	const isAuth = !!token
	const isAuthPage = request.url.includes('/account')
	const isPublicPage = request.nextUrl.pathname === '/'

	// Если пользователь авторизован
	if (isAuth) {
		// Если пытается зайти на страницу авторизации - редирект на главную или from
		if (isAuthPage) {
			const from = request.nextUrl.searchParams.get('from') || '/'
			return NextResponse.redirect(new URL(from, request.url))
		}
		// Иначе пропускаем дальше
		return NextResponse.next()
	}

	// Если пользователь не авторизован:
	if (!isAuth) {
		if (isPublicPage) {
			return NextResponse.next()
		}

		// Если пользователь НЕ авторизован и пытается зайти на защищенный маршрут
		if (!isAuthPage) {
			let from = request.nextUrl.pathname
			if (request.nextUrl.search) {
				from += request.nextUrl.search
			}
			return NextResponse.redirect(
				createRedirectUrl(AUTH_ROUTES.SIGN_IN, from, request)
			)
		}
	}

	// Для всех остальных случаев - пропускаем
	return NextResponse.next()
}

// Защищаем все роуты кроме публичных
export const config = {
	matcher: [
		'/((?!api/metadata|api|_next/static|_next/image|favicon.ico|images).*)',
		'/api/auth/signout'
	]
}
