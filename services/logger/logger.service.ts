import path from 'path'

import { ILoggerService, LoggerService, LogLevel } from './logger.interface'

import fs from 'fs/promises'

export class Logger implements ILoggerService {
	private static instance: Logger
	private readonly logDir: string
	private readonly logFile: string
	private readonly maxLogSize: number = 20 * 1024 * 1024 // 10MB
	private readonly maxLogFiles: number = 40 // Максимальное количество файлов логов
	private readonly DEBUG_MODE: boolean

	private constructor() {
		this.logDir = path.join(process.cwd(), 'storage', 'logs')
		this.logFile = path.join(
			this.logDir,
			`app-${new Date().toISOString().split('T')[0]}.log`
		)
		this.DEBUG_MODE = process.env.DEBUG_MODE === 'true'
		this.ensureLogDir()
	}

	private async ensureLogDir() {
		try {
			await fs.access(this.logDir)
		} catch {
			await fs.mkdir(this.logDir, { recursive: true })
		}
	}

	static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger()
		}
		return Logger.instance
	}

	private async rotateLogIfNeeded() {
		try {
			// Проверяем существование файла перед получением статистики
			try {
				await fs.access(this.logFile)
			} catch {
				// Файл не существует, создаем пустой файл
				await fs.writeFile(this.logFile, '')
				return // Нет необходимости в ротации для нового файла
			}
			
			const stats = await fs.stat(this.logFile)
			if (stats.size >= this.maxLogSize) {
				const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
				const newPath = `${this.logFile}.${timestamp}`
				await fs.rename(this.logFile, newPath)
			
				// Очистка старых логов
				const files = await fs.readdir(this.logDir)
				const logFiles = files
					.filter(file => file.startsWith('app-'))
					.map(file => path.join(this.logDir, file))
					.sort()
					.reverse()
			
				// Удаляем старые файлы, оставляя только maxLogFiles последних
				if (logFiles.length > this.maxLogFiles) {
					const filesToDelete = logFiles.slice(this.maxLogFiles)
					await Promise.all(
						filesToDelete.map(file => fs.unlink(file))
					)
				}
			}
		} catch (error) {
			console.error('Log rotation error:', error)
		}
	}

	async log(
		service: LoggerService,
		level: keyof LogLevel,
		message: string,
		...meta: any[]
	): Promise<void> {
		await this.rotateLogIfNeeded()

		const timestamp = new Date().toISOString()
		const logMessage = `[${level.toUpperCase()}][${service}][${timestamp}] ${message} ${meta.length ? JSON.stringify(meta) : ''}\n`

		if (level === 'error' || level === 'warn') {
			console[level](logMessage)
		}

		if (level === 'debug' && !this.DEBUG_MODE) {
			return
		}

		try {
			await fs.appendFile(this.logFile, logMessage)
		} catch (err) {
			console.error('Failed to write to log file:', err)
		}
	}

	async debug(
		service: LoggerService,
		message: string,
		...meta: any[]
	): Promise<void> {
		await this.log(service, 'debug', message, ...meta)
	}

	async info(
		service: LoggerService,
		message: string,
		...meta: any[]
	): Promise<void> {
		await this.log(service, 'info', message, ...meta)
	}

	async warn(
		service: LoggerService,
		message: string,
		...meta: any[]
	): Promise<void> {
		await this.log(service, 'warn', message, ...meta)
	}

	async error(
		service: LoggerService,
		message: string,
		...meta: any[]
	): Promise<void> {
		await this.log(service, 'error', message, ...meta)
	}
}
