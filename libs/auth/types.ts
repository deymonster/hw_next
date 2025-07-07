import { Role } from '@prisma/client'
import { User } from 'next-auth'
import { DefaultSession } from 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
	interface Session {
		user: {
			id: string
			email: string
			role: Role
			image?: string | null
			sessionId?: string
		} & DefaultSession['user']
	}
}

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
