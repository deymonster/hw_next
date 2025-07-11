export const AUTH_ROUTES = {
	// Основные маршруты аутентификации
	SIGN_IN: '/account/login',
	SIGN_UP: '/account/create',
	VERIFY_EMAIL: '/account/verify-email',
	RESET_PASSWORD: '/account/reset-password',

	// API маршруты
	API: {
		SIGN_IN: '/api/auth/signin',
		SIGN_UP: '/api/auth/signup',
		VERIFY_EMAIL: '/api/auth/verify-email',
		RESET_PASSWORD: '/api/auth/reset-password'
	}
} as const

// Настройки сессии
export const SESSION_CONFIG = {
	strategy: 'jwt' as const,
	// strategy: 'database' as const,
	maxAge: 30 * 24 * 60 * 60, // 30 дней
	updateAge: 24 * 60 * 60 // 24 часа
} as const

// Сообщения об ошибках
export const AUTH_ERRORS = {
	INVALID_CREDENTIALS: 'Неверный email или пароль',
	EMAIL_NOT_VERIFIED: 'Email не подтвержден',
	USER_NOT_FOUND: 'Пользователь не найден',
	RESET_PASSWORD_FAILED: 'Ошибка при сбросе пароля',
	EMAIL_ALREADY_EXISTS: 'Пользователь с таким email уже существует',
	INVALID_TOKEN: 'Недействительный токен',
	TOKEN_EXPIRED: 'Срок действия токена истек',
	TOKEN_MISSING: 'Токен отсутствует',
	EMAIL_VERIFICATION_ERROR: 'Ошибка подтверждения email',
	EMAIL_VERIFICATION_SUCCESS: 'Email успешно подтвержден',
	CREATE_USER_FAILED: 'Не удалось создать пользователя',
	AUTHENTICATION_FAILED: 'Произошла ошибка при аутентификации',
	UPDATE_PASSWORD_FAILED: 'Произошла ошибка при обновлении пароля'
} as const

// Настройки безопасности
export const SECURITY_CONFIG = {
	BCRYPT_ROUNDS: 12,
	MIN_PASSWORD_LENGTH: 8,
	JWT_SECRET: process.env.NEXTAUTH_SECRET
} as const

// Регулярные выражения для валидации
export const VALIDATION_RULES = {
	PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
	EMAIL_REGEX: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
} as const

export const REDIS_CONFIG = {
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT,
	password: process.env.REDIS_PASSWORD
} as const

export const KEY_PREFIXES = {
	SESSION: 'session:',
	USER: 'user:',
	EMAIL_VERIFICATION: 'email_verification:',
	USER_CACHE: 'user-cache:',
	BLOCKED_TOKEN: 'blocked-token:', // Префикс для блокированных токенов
	USER_TOKENS: 'user-tokens:' // Префикс для списка токенов пользователя
} as const

export const TTL = {
	SESSION: 60 * 60 * 24 * 7, // 7 days
	EMAIL_VERIFICATION: 60 * 60 * 24, // 24 hours
	USER_CACHE: 60 * 5, // 5 минут
	BLOCKED_TOKEN: 60 * 60 * 24 * 30 // 30 дней (должно быть больше maxAge сессии)
} as const
