import Redis from 'ioredis'

import redis from './client'
import { KEY_PREFIXES, TTL } from './constants'
import type { UserSession } from './types'
import { Logger } from '../logger/logger.service'
import { LoggerService, LogLevel } from '../logger/logger.interface'

export class RedisService {
	private readonly client: Redis
	private static instance: RedisService | null = null
	private readonly logger = Logger.getInstance()

	private async log(level: keyof LogLevel, message: string, ...args: any[]) {
		await this.logger.log(
			LoggerService.REDIS_SERVICE,
			level,
			message,
			...args
		)
	}

	private generateUUID(): string {
		// Используем Web Crypto API вместо crypto
		const array = new Uint8Array(16)
		crypto.getRandomValues(array)
		return Array.from(array, byte =>
			byte.toString(16).padStart(2, '0')
		).join('')
	}

	constructor() {
		if (typeof window !== 'undefined') {
			throw new Error('RedisService can only be used on the server side')
		}
		if (!redis) {
			throw new Error('Redis client is not initialized')
		}
		this.client = redis
	}

	public static getInstance(): RedisService {
		if (typeof window !== 'undefined') {
			throw new Error('RedisService can only be used on the server side')
		}

		if (!RedisService.instance) {
			RedisService.instance = new RedisService()
		}

		return RedisService.instance
	}

	private convertToRedisHash(
		data: Record<string, any>
	): Record<string, string> {
		return Object.entries(data).reduce(
			(acc, [key, value]) => ({
				...acc,
				[key]:
					typeof value === 'object'
						? JSON.stringify(value)
						: String(value)
			}),
			{}
		)
	}

	private convertFromRedisHash(hash: Record<string, string>): UserSession {
		const session = {
			...hash,
			lastActive: parseInt(hash.lastActive),
			createdAt: parseInt(hash.createdAt),
			isActive: hash.isActive === 'true',
			metadata: hash.metadata ? JSON.parse(hash.metadata) : undefined
		} as UserSession
		return session
	}

	private getBrowserInfo(ua: string): { name: string; version: string } {
		if (ua.includes('Firefox/'))
			return {
				name: 'Firefox',
				version: ua.split('Firefox/')[1].split(' ')[0]
			}
		if (ua.includes('Chrome/'))
			return {
				name: 'Chrome',
				version: ua.split('Chrome/')[1].split(' ')[0]
			}
		if (ua.includes('Safari/'))
			return {
				name: 'Safari',
				version: ua.split('Version/')[1]?.split(' ')[0] || 'Unknown'
			}
		if (ua.includes('Edge/'))
			return { name: 'Edge', version: ua.split('Edge/')[1].split(' ')[0] }
		return { name: 'Unknown', version: 'Unknown' }
	}

	private getOSInfo(ua: string): { name: string; version: string } {
		if (ua.includes('Windows NT'))
			return {
				name: 'Windows',
				version: ua.split('Windows NT ')[1].split(';')[0]
			}
		if (ua.includes('Mac OS X'))
			return {
				name: 'MacOS',
				version: ua.split('Mac OS X ')[1].split(')')[0]
			}
		if (ua.includes('Linux')) return { name: 'Linux', version: 'Unknown' }
		if (ua.includes('Android'))
			return {
				name: 'Android',
				version: ua.split('Android ')[1].split(';')[0]
			}
		if (ua.includes('iOS'))
			return { name: 'iOS', version: ua.split('OS ')[1].split(' ')[0] }
		return { name: 'Unknown', version: 'Unknown' }
	}

	private getDeviceType(ua: string): string {
		if (ua.includes('Mobile')) return 'mobile'
		if (ua.includes('Tablet')) return 'tablet'
		return 'desktop'
	}

	async createUserSession(
		userId: string,
		data: {
			userAgent?: string
			ip?: string
		}
	): Promise<string> {
		const sessionId = this.generateUUID()
		await this.log('info', '[CREATING_SESSION]', { sessionId })

		const browser = data.userAgent
			? this.getBrowserInfo(data.userAgent)
			: { name: 'Unknown', version: 'Unknown' }
		const os = data.userAgent
			? this.getOSInfo(data.userAgent)
			: { name: 'Unknown', version: 'Unknown' }

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
					type: data.userAgent
						? this.getDeviceType(data.userAgent)
						: 'Unknown',
					userAgent: data.userAgent || 'Unknown'
				},
				network: {
					ip: data.ip || 'Unknown'
				}
			}
		}

		const key = `${KEY_PREFIXES.SESSION_INFO}${sessionId}`
		await this.log('debug', '[SETTING_SESSION]', { key })

		const hashData = this.convertToRedisHash(session)
		await this.log('debug', '[HASH_DATA]', { hashData })

		await this.client.hset(key, hashData)

		await this.client.sadd(
			`${KEY_PREFIXES.USER_SESSIONS}${userId}`,
			sessionId
		)

		await this.client.expire(
			`${KEY_PREFIXES.SESSION_INFO}${sessionId}`,
			TTL.USER_SESSION
		)

		return sessionId
	}

	async getSession(sessionId: string): Promise<UserSession | null> {
		const key = `${KEY_PREFIXES.SESSION_INFO}${sessionId}`
		await this.log('debug', '[GETTING_SESSION]', { key })

		const exists = await this.client.exists(key)
		await this.log('debug', '[KEY_EXISTS]', { exists })

		if (!exists) {
			await this.log('info', '[SESSION_NOT_FOUND]', { sessionId })
			return null
		}

		const sessionData = await this.client.hgetall(key)
		await this.log('debug', '[RAW_SESSION_DATA]', { sessionData })
		return sessionData && Object.keys(sessionData).length > 0
			? this.convertFromRedisHash(sessionData)
			: null
	}

	async getUserSessions(userId: string): Promise<UserSession[]> {
		const sessionIds = await this.client.smembers(
			`${KEY_PREFIXES.USER_SESSIONS}${userId}`
		)

		if (!sessionIds.length) return []

		const sessions = await Promise.all(
			sessionIds.map(async sessionId => {
				const sessionData = await this.client.hgetall(
					`${KEY_PREFIXES.SESSION_INFO}${sessionId}`
				)
				return sessionData && Object.keys(sessionData).length > 0
					? this.convertFromRedisHash(sessionData)
					: null
			})
		)

		return sessions.filter(
			(session): session is UserSession => session !== null
		)
	}

	async deactivateSession(sessionId: string): Promise<void> {
		await this.log('info', '[DEACTIVATING_SESSION]', { sessionId })
		await this.client.hset(
			`${KEY_PREFIXES.SESSION_INFO}${sessionId}`,
			'isActive',
			'false'
		)
	}

	async deleteUserSession(userId: string, sessionId: string): Promise<void> {
		await this.log('info', '[DELETING_USER_SESSION]', { userId, sessionId })
		await this.client.del(`${KEY_PREFIXES.SESSION_INFO}${sessionId}`)
		await this.client.srem(
			`${KEY_PREFIXES.USER_SESSIONS}${userId}`,
			sessionId
		)
	}

	async deleteSession(sessionId: string): Promise<void> {
		await this.log('info', '[DELETING_SESSION]', { sessionId })
		// Получаем sessionData чтобы узнать userId
		const sessionData = await this.client.hgetall(
			`${KEY_PREFIXES.SESSION_INFO}${sessionId}`
		)

		if (sessionData && sessionData.userId) {
			// Используем существующий метод
			await this.deleteUserSession(sessionData.userId, sessionId)
		} else {
			// Если не нашли userId, просто удаляем основную запись
			await this.client.del(`${KEY_PREFIXES.SESSION_INFO}${sessionId}`)
		}
	}

	async updateSessionActivity(sessionId: string): Promise<void> {
		await this.client.hset(
			`${KEY_PREFIXES.SESSION_INFO}${sessionId}`,
			'lastActive',
			Date.now().toString()
		)
	}

	async deleteAllUserSessions(userId: string): Promise<void> {
		await this.log('info', '[DELETING_ALL_USER_SESSIONS]', { userId })
		const sessionIds = await this.client.smembers(
			`${KEY_PREFIXES.USER_SESSIONS}${userId}`
		)
		if (sessionIds.length > 0) {
			// Удаляем информацию о сессиях
			await Promise.all(
				sessionIds.map(id =>
					this.client.del(`${KEY_PREFIXES.SESSION_INFO}${id}`)
				)
			)
			// Удаляем set с идентификаторами сессий
			await this.client.del(`${KEY_PREFIXES.USER_SESSIONS}${userId}`)
		}
	}

	async getSessionByToken(
		sessionToken: string
	): Promise<{ sessionId?: string; userId?: string } | null> {
		await this.log('debug', '[GETTING_SESSION_BY_TOKEN]', { sessionToken })
		// 1. Сначала проверим, есть ли у нас сессия с таким токеном
		const sessionKey = `${KEY_PREFIXES.SESSION_INFO}${sessionToken}`
		const exists = await this.client.exists(sessionKey)

		if (!exists) {
			await this.log('info', '[SESSION_TOKEN_NOT_FOUND]', { sessionToken })
			return null
		}

		// 2. Получаем данные сессии
		const sessionData = await this.client.hgetall(sessionKey)

		if (!sessionData || Object.keys(sessionData).length === 0) {
			await this.log('warn', '[SESSION_DATA_EMPTY]', { sessionToken })
			return null
		}

		// 3. Конвертируем данные из Redis hash в нормальный объект
		try {
			const session = this.convertFromRedisHash(sessionData)
			return {
				sessionId: session.sessionId,
				userId: session.userId
			}
		} catch (error) {
			await this.log('error', '[SESSION_PARSE_ERROR]', { sessionToken, error })
			return null
		}
	}
}

// Экспортируем функцию для получения инстанса
export const getRedisService = () => RedisService.getInstance()
