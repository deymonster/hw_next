import Redis from 'ioredis'
import redis from './client'
import { KEY_PREFIXES, TTL } from './constants'
import type { SessionData } from './types'

export class RedisService {
  private readonly client: Redis;  
  private static instance: RedisService | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('RedisService can only be used on the server side');
    }
    if (!redis) {
      throw new Error('Redis client is not initialized');
    }
    this.client = redis;
  }

  public static getInstance(): RedisService {
    if (typeof window !== 'undefined') {
      throw new Error('RedisService can only be used on the server side');
    }
    
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    
    return RedisService.instance;
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

  // Новые методы для работы с кэшем пользователя
  async setUserCache(userId: string, data: any): Promise<void> {
    const key = `${KEY_PREFIXES.USER_CACHE}${userId}`
    await this.client.set(key, JSON.stringify(data), 'EX', TTL.USER_CACHE);
  }

  async getUserCache(userId: string): Promise<any | null> {
    const key = `${KEY_PREFIXES.USER_CACHE}${userId}`
    const data = await this.client.get(key)
    return data ? JSON.parse(data) : null
  }

  async deleteUserCache(userId: string): Promise<void> {
    const key = `${KEY_PREFIXES.USER_CACHE}${userId}`
    await this.client.del(key)
  }
}

// Экспортируем функцию для получения инстанса
export const getRedisService = () => RedisService.getInstance();
