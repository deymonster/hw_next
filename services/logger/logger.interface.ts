export enum LoggerService {
	APP = 'APP',
	PROMETHEUS_SERVICE = 'PROMETHEUS_SERVICE',
	PROMETHEUS_PARSER = 'PROMETHEUS_PARSER',
	// Новые сервисы
	DEVICE_SERVICE = 'DEVICE_SERVICE',
	USER_SERVICE = 'USER_SERVICE',
	AUTH_SERVICE = 'AUTH_SERVICE',
	EMAIL_SERVICE = 'EMAIL_SERVICE',
	TELEGRAM_SERVICE = 'TELEGRAM_SERVICE',
	NETWORK_SCANNER = 'NETWORK_SCANNER',
	ALERT_RULES = 'ALERT_RULES',
	REDIS_SERVICE = 'REDIS_SERVICE',
	STORAGE_SERVICE = 'STORAGE_SERVICE',
	METRICS_SERVICE = 'METRICS_SERVICE',
	SMTP_SERVICE = 'SMTP_SERVICE',
	EVENT_SERVICE = 'EVENT_SERVICE',
	INVENTORY_SERVICE = 'INVENTORY_SERVICE'
}

export interface LogLevel {
	debug: string
	info: string
	warn: string
	error: string
}

export interface ILoggerService {
	log(
		service: LoggerService,
		level: keyof LogLevel,
		message: string,
		...meta: any[]
	): void
	debug(service: LoggerService, message: string, ...meta: any[]): void
	info(service: LoggerService, message: string, ...meta: any[]): void
	warn(service: LoggerService, message: string, ...meta: any[]): void
	error(service: LoggerService, message: string, ...meta: any[]): void
}
