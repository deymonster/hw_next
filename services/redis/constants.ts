export const REDIS_CONFIG = {
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT,
	password: process.env.REDIS_PASSWORD
} as const

export const KEY_PREFIXES = {
	SESSION: 'session:',
	USER_SESSIONS: 'user-sessions:',
	USER: 'user:',
	EMAIL_VERIFICATION: 'email_verification:',
	SESSION_INFO: 'session-info:',
	USER_CACHE: 'user-cache:' // Добавляем префикс для кэша пользователя
} as const

export const TTL = {
	SESSION: 60 * 60 * 24 * 7, // 7 days
	EMAIL_VERIFICATION: 60 * 60 * 24, // 24 hours
	USER_CACHE: 60 * 5, // 5 минут
	USER_SESSION: 60 * 60 * 24 * 30
} as const
