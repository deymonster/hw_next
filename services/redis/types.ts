import type { JWT } from "next-auth/jwt"
import { Role } from "@prisma/client"


declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: Role
    sessionId?: string
  }
}

export interface RedisConfig {
    host: string;
    port: number;
    password: string;
  }
  
export interface SessionData {
  userId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

export interface UserSession {
  sessionId: string
  userId: string
  lastActive: number
  isActive: boolean
  createdAt: number
  metadata?: {
    device?: {
      browser: string
      browserVersion: string
      os: string
      osVersion: string
      type: string
      userAgent: string
    }
    network?: {
      ip: string
    }
  }
}

