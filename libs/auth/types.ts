import { AdapterSession } from '@auth/core/adapters'
import { Awaitable } from '@auth/core/types'
import { Role } from '@prisma/client'
import { DefaultSession } from 'next-auth'
import { JWT } from 'next-auth/jwt'

// Расширяем стандартный тип User
export interface CustomUser {
	id: string
	email: string
	role: Role
	name?: string | null
	image?: string | null
	sessionId?: string
}

// Расширяем тип Session
export interface CustomSession extends DefaultSession {
	user: {
		id: string
		email: string
		role: Role
		image?: string | null
		sessionId?: string
	} & DefaultSession['user']
}

// Расширяем тип JWT
export interface CustomJWT extends JWT {
	id: string
	email: string
	role: Role
	sessionId?: string
}

// Тип для ответа аутентификации
export interface AuthResponse {
	success: boolean
	message?: string
	user?: CustomUser
}

declare module 'next-auth' {
	interface Session extends CustomSession {}
	interface User extends CustomUser {} 
	interface JWT extends CustomJWT {}

	interface EventCallbacks {
		signOut: (message: 
		| { token: JWT | null } 
		| { session: AdapterSession | null }
		) => Awaitable<void> 
  	}
}