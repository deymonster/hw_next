import { Session, User } from "next-auth"
import { JWT } from "next-auth/jwt"
import { Role } from "@prisma/client"

// Расширяем стандартный тип User
export interface CustomUser extends User {
  id: string
  email: string
  emailVerified: Date | null
  role: Role
  createdAt: Date
  updatedAt: Date
}



// Расширяем тип Session
export interface CustomSession extends Session {
  user: {
    id: string
    email: string
    role: Role
  } & Session["user"]
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