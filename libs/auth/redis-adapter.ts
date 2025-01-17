import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from '@auth/core/adapters'
import type { Redis } from 'ioredis'

export function RedisAdapter(client: Redis): Adapter {
  const getUser = async (id: string): Promise<AdapterUser | null> => {
    const user = await client.hgetall(`user:${id}`)
    if (!user || !Object.keys(user).length) return null
    
    return {
      ...user,
      id,
      email: user.email ?? '',
      emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      image: user.image ?? null,
      name: user.name ?? null
    } as AdapterUser
  }

  return {
    async createUser(user) {
      const id = crypto.randomUUID()
      const adapterUser: AdapterUser = {
        ...user,
        id,
        email: user.email ?? '',
        emailVerified: null,
        image: user.image ?? null,
        name: user.name ?? null
      }
      await client.hset(`user:${id}`, adapterUser as unknown as Record<string, string>)
      if (adapterUser.email) await client.set(`email:${adapterUser.email}`, id)
      return adapterUser
    },

    async getUser(id: string) {
      return await getUser(id)
    },

    async getUserByEmail(email: string) {
      const id = await client.get(`email:${email}`)
      if (!id) return null
      return await getUser(id)
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const id = await client.get(`${provider}:${providerAccountId}`)
      if (!id) return null
      return await getUser(id)
    },

    async updateUser(user: Partial<AdapterUser> & { id: string }): Promise<AdapterUser> {
      const existing = await getUser(user.id)
      if (!existing) throw new Error('User not found')

      const updatedUser: AdapterUser = {
        ...existing,
        ...user,
        email: user.email ?? existing.email,
        emailVerified: user.emailVerified ?? existing.emailVerified,
        name: user.name ?? existing.name,
        image: user.image ?? existing.image
      }

      await client.hset(`user:${user.id}`, updatedUser as unknown as Record<string, string>)
      if (updatedUser.email) await client.set(`email:${updatedUser.email}`, user.id)
      return updatedUser
    },

    async deleteUser(userId: string): Promise<AdapterUser | null> {
      const user = await getUser(userId)
      if (!user) return null
      await client.del(`user:${userId}`)
      if (user.email) await client.del(`email:${user.email}`)
      return user
    },

    async linkAccount(account: AdapterAccount) {
      await client.set(
        `${account.provider}:${account.providerAccountId}`,
        account.userId
      )
      await client.hset(`account:${account.provider}:${account.providerAccountId}`, 
        account as unknown as Record<string, string>
      )
      return account
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await client.del(`${provider}:${providerAccountId}`)
      await client.del(`account:${provider}:${providerAccountId}`)
    },

    async createSession(session: AdapterSession): Promise<AdapterSession> {
      const sessionData = {
        ...session,
        expires: session.expires.toISOString()
      }
      await client.hset(
        `session:${session.sessionToken}`, 
        sessionData as unknown as Record<string, string>
      )
      await client.expire(`session:${session.sessionToken}`, 60 * 60 * 24 * 7)
      await client.set(`user:${session.userId}:session`, 
                        session.sessionToken,
                        'EX', 60 * 60 * 24 * 7
                    )
      return session
    },

    async getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const rawSession = await client.hgetall(`session:${sessionToken}`)
      if (!rawSession?.userId) return null

      const user = await getUser(rawSession.userId)
      if (!user) return null

      const session: AdapterSession = {
        sessionToken,
        userId: rawSession.userId,
        expires: new Date(rawSession.expires)
      }

      return {
        session,
        user
      }
    },

    async updateSession(session: Partial<AdapterSession> & { sessionToken: string }): Promise<AdapterSession | null> {
      const existing = await client.hgetall(`session:${session.sessionToken}`)
      if (!existing) return null

      const updatedSession: AdapterSession = {
        sessionToken: session.sessionToken,
        userId: session.userId ?? existing.userId,
        expires: session.expires ?? new Date(existing.expires)
      }

      await client.hset(
        `session:${session.sessionToken}`, 
        { ...updatedSession, expires: updatedSession.expires.toISOString() } as unknown as Record<string, string>
      )
      return updatedSession
    },

    async deleteSession(sessionToken: string) {
      const session = await client.hgetall(`session:${sessionToken}`)
      if (session?.userId) {
        await client.del(`user:${session.userId}:session`)
      }
      await client.del(`session:${sessionToken}`)
    },

    async createVerificationToken(token: VerificationToken): Promise<VerificationToken> {
      await client.set(
        `verification-token:${token.identifier}:${token.token}`,
        JSON.stringify(token),
        'EX',
        60 * 60 // 1 hour
      )
      return token
    },

    async useVerificationToken({ identifier, token }): Promise<VerificationToken | null> {
      const key = `verification-token:${identifier}:${token}`
      const tokenStr = await client.get(key)
      if (!tokenStr) return null
      await client.del(key)
      return JSON.parse(tokenStr) as VerificationToken
    }
  }
}