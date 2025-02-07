import { User } from "next-auth"
import { JWT } from "next-auth/jwt"
import { Role } from "@prisma/client"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            email: string
            role: Role
            image?: string | null
            
        } & DefaultSession["user"]
    }
}

// Расширяем стандартный тип User
export interface CustomUser {
  id: string
  email: string
  role: Role
  name?: string | null
  image?: string | null
}

// Расширяем тип Session
export interface CustomSession extends DefaultSession {
    user: {
        id: string
        email: string
        role: Role
        image?: string | null
        
    } & DefaultSession["user"]
}

// Расширяем тип JWT
export interface CustomJWT extends JWT {
  id: string
  email: string
  role: Role
}

// Тип для ответа аутентификации
export interface AuthResponse {
  success: boolean
  message?: string
  user?: User
}