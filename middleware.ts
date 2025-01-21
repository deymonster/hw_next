import { AUTH_ROUTES } from "./libs/auth/constants"
import  { type NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export default async function middleware(request: NextRequest) {
  // const session = request.cookies.get('authjs.session-token')?.value
  
  // const isAuthPageTest = request.url.includes('/account/')
  

  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "authjs.session-token",
    secureCookie: process.env.NODE_ENV === "production",
  })

  console.log('Token', token)
  
  const isAuth = !!token
  const isAuthPage = request.url.includes('/account')
  
  // Если пользователь авторизован
  if (isAuth) {
    // Если пытается зайти на страницу авторизации - редирект на главную или from
    if (isAuthPage) {
      const from = request.nextUrl.searchParams.get('from') || '/settings';
      return NextResponse.redirect(new URL(from, request.url));
    }
    // Иначе пропускаем дальше
    return NextResponse.next();
  }

  // Если пользователь НЕ авторизован и пытается зайти на защищенный маршрут
  if (!isAuthPage) {
    let from = request.nextUrl.pathname;
    if (request.nextUrl.search) {
      from += request.nextUrl.search;
    }
    return NextResponse.redirect(
      new URL(`${AUTH_ROUTES.SIGN_IN}?from=${encodeURIComponent(from)}`, request.url)
    );
  }

  // Для всех остальных случаев - пропускаем
  return null;
}

// Защищаем все роуты кроме публичных
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|account/:path*).*)',
  ]
}