export enum LoggerService {
	APP = 'APP',
	PROMETHEUS_SERVICE = 'PROMETHEUS_SERVICE',
	PROMETHEUS_PARSER = 'PROMETHEUS_PARSER'
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
