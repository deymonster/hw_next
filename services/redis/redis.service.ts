import Redis from 'ioredis'
import redis from './client'
import { KEY_PREFIXES, TTL } from './constants'
import type { SessionData } from './types'

export class RedisService {
  private readonly client: Redis;  // Изменили тип на Redis

  constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('RedisService can only be used on the server side');
    }
    if (!redis) {
      throw new Error('Redis client is not initialized');
    }
    this.client = redis;
  }

  async setSession(sessionId: string, data: SessionData): Promise<void> {
    const key = `${KEY_PREFIXES.SESSION}${sessionId}`
    await this.client.set(key, JSON.stringify(data), 'EX', TTL.SESSION);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = `${KEY_PREFIXES.SESSION}${sessionId}`
    const data = await this.client.get(key)
    return data ? JSON.parse(data) : null
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `${KEY_PREFIXES.SESSION}${sessionId}`
    await this.client.del(key)
  }
}

// Создаем синглтон только на серверной стороне
const redisService = typeof window === 'undefined' ? new RedisService() : null;

export { redisService };
