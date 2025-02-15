import type { NextAuthConfig } from "next-auth"
import { AUTH_ROUTES, SESSION_CONFIG } from "./constants"
import { CustomSession, CustomUser } from "./types"
import { Role } from "@prisma/client"
import { providers } from "./providers"

interface CustomToken {
  id?: string
  email?: string
  role?: Role
  image?: string | null
  name?: string | null
}

export const authConfig: NextAuthConfig = {
  providers, 
  session: SESSION_CONFIG,

  pages: {
    signIn: AUTH_ROUTES.SIGN_IN,
    newUser: AUTH_ROUTES.SIGN_UP,
    verifyRequest: AUTH_ROUTES.VERIFY_EMAIL,
    error: '/auth/error',
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Если это первый вход пользователя
      if (user) {
        return {
          ...token,
          id: user.id,
          email: user.email,
          role: (user as CustomUser).role,
          image: user.image || null,
          name: user.name || null
        }
      }

      // Если это обновление сессии через updateSession
      if (trigger === "update" && session?.user) {
        return {
          ...token,
          ...session.user
        }
      }

      return token
    },

    async session({ session, token }): Promise<CustomSession> {
      const customToken = token as CustomToken;
      
      
      return {
        ...session,
        user: {
          ...session.user,
          id: customToken.id!,
          email: customToken.email!,
          role: customToken.role as Role,
          image: customToken.image || null
        }
      }
    }
  },

  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
}