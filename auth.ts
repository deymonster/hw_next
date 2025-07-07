import NextAuth from 'next-auth'

import { authConfig } from '@/libs/auth/config'

export const {
	auth,
	signIn,
	signOut,
	handlers: { GET, POST }
} = NextAuth(authConfig)
