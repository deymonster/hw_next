import Redis from 'ioredis'
import redis from './client'
import { KEY_PREFIXES, TTL } from './constants'
import type { UserSession } from './types'




export class RedisService {
  private readonly client: Redis;  
  private static instance: RedisService | null = null;

  private generateUUID(): string {
    // Используем Web Crypto API вместо crypto
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

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


  private convertToRedisHash(data: Record<string, any>): Record<string, string> {
    return Object.entries(data).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }), {});
  }

  private convertFromRedisHash(hash: Record<string, string>): UserSession {
    const session = {
      ...hash,
      lastActive: parseInt(hash.lastActive),
      createdAt: parseInt(hash.createdAt),
      isActive: hash.isActive === 'true',
      metadata: hash.metadata ? JSON.parse(hash.metadata) : undefined
    } as UserSession;
    return session;
  }

  private getBrowserInfo(ua: string): { name: string, version: string } {
    if (ua.includes('Firefox/')) return { name: 'Firefox', version: ua.split('Firefox/')[1].split(' ')[0] }
    if (ua.includes('Chrome/')) return { name: 'Chrome', version: ua.split('Chrome/')[1].split(' ')[0] }
    if (ua.includes('Safari/')) return { name: 'Safari', version: ua.split('Version/')[1]?.split(' ')[0] || 'Unknown' }
    if (ua.includes('Edge/')) return { name: 'Edge', version: ua.split('Edge/')[1].split(' ')[0] }
    return { name: 'Unknown', version: 'Unknown' }
  }

  private getOSInfo(ua: string): { name: string, version: string } {
    if (ua.includes('Windows NT')) return { name: 'Windows', version: ua.split('Windows NT ')[1].split(';')[0] }
    if (ua.includes('Mac OS X')) return { name: 'MacOS', version: ua.split('Mac OS X ')[1].split(')')[0] }
    if (ua.includes('Linux')) return { name: 'Linux', version: 'Unknown' }
    if (ua.includes('Android')) return { name: 'Android', version: ua.split('Android ')[1].split(';')[0] }
    if (ua.includes('iOS')) return { name: 'iOS', version: ua.split('OS ')[1].split(' ')[0] }
    return { name: 'Unknown', version: 'Unknown' }
  }

  private getDeviceType(ua: string): string {
    if (ua.includes('Mobile')) return 'mobile'
    if (ua.includes('Tablet')) return 'tablet'
    return 'desktop'
  }

  async createUserSession(userId: string, 
    data: {
    userAgent?: string 
    ip?: string
  }): Promise<string> {
      const sessionId = this.generateUUID()
      console.log('[Redis] Creating new session:', sessionId)
      
      const browser = data.userAgent ? this.getBrowserInfo(data.userAgent) : { name: 'Unknown', version: 'Unknown' }
      const os = data.userAgent ? this.getOSInfo(data.userAgent) : { name: 'Unknown', version: 'Unknown' }
      
      const session: UserSession = {
        sessionId,
        userId,
        lastActive: Date.now(),
        isActive: true,
        createdAt: Date.now(),
        metadata: {
          device: {
            browser: browser.name,
            browserVersion: browser.version,
            os: os.name,
            osVersion: os.version,
            type: data.userAgent? this.getDeviceType(data.userAgent) : 'Unknown',
            userAgent: data.userAgent || 'Unknown'
          },
          network: {
            ip: data.ip || 'Unknown'
          }
        }
      }

      const key = `${KEY_PREFIXES.SESSION_INFO}${sessionId}`
      console.log('[Redis] Setting session with key:', key)

      const hashData = this.convertToRedisHash(session)
      console.log('[Redis] Hash data to save:', hashData)

      await this.client.hset(key, hashData)

      await this.client.sadd(
        `${KEY_PREFIXES.USER_SESSIONS}${userId}`,
        sessionId
      );

      await this.client.expire(
        `${KEY_PREFIXES.SESSION_INFO}${sessionId}`,
        TTL.USER_SESSION
      );

      return sessionId
  }

  async getSession(sessionId: string): Promise<UserSession | null> {
    const key = `${KEY_PREFIXES.SESSION_INFO}${sessionId}`
    console.log('[Redis] Getting session with key:', key)

    const exists = await this.client.exists(key)
    console.log('[Redis] Key exists:', exists)
    
    if (!exists) {
      console.log('[Redis] Session key not found')
      return null
    }

    const sessionData = await this.client.hgetall(key) 
    console.log('[Redis] Raw session data:', sessionData)
    return sessionData && Object.keys(sessionData).length > 0
      ? this.convertFromRedisHash(sessionData)
      : null;
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    const sessionIds = await this.client.smembers(
      `${KEY_PREFIXES.USER_SESSIONS}${userId}`
    );

    if (!sessionIds.length) return []

    const sessions = await Promise.all(
      sessionIds.map(async (sessionId) => {
        const sessionData = await this.client.hgetall(
          `${KEY_PREFIXES.SESSION_INFO}${sessionId}`
        );
        return sessionData && Object.keys(sessionData).length > 0 
          ? this.convertFromRedisHash(sessionData) 
          : null;
      })
    );

    return sessions.filter((session): session is UserSession => session !== null);
  }

  async deactivateSession(sessionId: string): Promise<void> {
    await this.client.hset(
      `${KEY_PREFIXES.SESSION_INFO}${sessionId}`,
      'isActive',
      'false'
    );
  }

  async deleteUserSession(userId: string, sessionId: string): Promise<void> {
    await this.client.del(`${KEY_PREFIXES.SESSION_INFO}${sessionId}`);
    await this.client.srem(
      `${KEY_PREFIXES.USER_SESSIONS}${userId}`,
      sessionId
    );
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.client.hset(
      `${KEY_PREFIXES.SESSION_INFO}${sessionId}`,
      'lastActive',
      Date.now().toString()
    );
  }



  

  

}

// Экспортируем функцию для получения инстанса
export const getRedisService = () => RedisService.getInstance();
