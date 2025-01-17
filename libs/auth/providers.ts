import Credentials from "next-auth/providers/credentials"
import { AUTH_ERRORS } from "./constants"
import { CustomUser } from "./types"
import { services } from '@/services/index'
import * as bcrypt from 'bcryptjs'
import { Role } from "@prisma/client"

// Специальный класс для ошибок аутентификации
class AuthError extends Error {
  constructor(code: keyof typeof AUTH_ERRORS) {
    super(code);
    this.name = 'AuthError';
  }
}



export const providers = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { 
        label: "Email", 
        type: "email"
      },
      password: { 
        label: "Password", 
        type: "password"
      }
    },
    async authorize(credentials, req) {
      try {
        const email = credentials?.email as string
        const password = credentials?.password as string

        if (!email || !password) {
          throw new AuthError('INVALID_CREDENTIALS')
        }

        const user = await services.user.getByEmail(email)

        if (!user) {
          throw new AuthError('USER_NOT_FOUND')
        }

        if (!user.emailVerified) {
          throw new AuthError('EMAIL_NOT_VERIFIED')
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
          throw new AuthError('INVALID_CREDENTIALS')
        }

        const customUser: CustomUser = {
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: user.role || Role.USER,
          emailVerified: user.emailVerified ? new Date() : null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }

        return customUser
      } catch (error) {
        if (error instanceof AuthError) {
          console.error('[AUTH_ERROR]', error)
          throw error
        }
        console.error('[AUTH_ERROR]', error)
        throw new AuthError('AUTHENTICATION_FAILED')
      }
    }
  })
]