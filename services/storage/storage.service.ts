import crypto from 'crypto'
import path from 'path'

import fs from 'fs/promises'
import { Logger } from '../logger/logger.service'
import { LoggerService, LogLevel } from '../logger/logger.interface'

interface FileValidationOptions {
	maxSize?: number // in bytes
	allowedTypes?: string[] // mime types
}

export class StorageService {
	private readonly uploadDir: string
	private readonly maxFileSize: number
	private readonly allowedFileTypes: string[]
	private readonly logger = Logger.getInstance()

	private async log(level: keyof LogLevel, message: string, ...args: any[]) {
		await this.logger.log(
			LoggerService.STORAGE_SERVICE,
			level,
			message,
			...args
		)
	}

	constructor() {
		this.uploadDir = path.join(process.cwd(), 'storage', 'uploads')
		this.maxFileSize = 20 * 1024 * 1024 // 20MB default
		this.allowedFileTypes = ['image/jpeg', 'image/png', 'image/gif']
		this.initializeStorage()
	}

	private async initializeStorage() {
		try {
			await fs.access(this.uploadDir)
			await this.log('info', '[STORAGE_INITIALIZED]', this.uploadDir)
		} catch {
			await fs.mkdir(this.uploadDir, { recursive: true })
			await this.log('info', '[STORAGE_CREATED]', this.uploadDir)
		}
	}

	private async validateFile(
		file: Buffer,
		fileType: string,
		options?: FileValidationOptions
	) {
		const fileSize = file.length
		const maxSize = options?.maxSize || this.maxFileSize

		if (fileSize > maxSize) {
			await this.log('warn', '[FILE_SIZE_EXCEEDED]', { fileSize, maxSize, fileType })
			throw new Error(`File size exceeds limit of ${maxSize} bytes`)
		}

		const allowedTypes = options?.allowedTypes || this.allowedFileTypes
		if (!allowedTypes.includes(fileType)) {
			await this.log('warn', '[FILE_TYPE_NOT_ALLOWED]', { fileType, allowedTypes })
			throw new Error(
				`File type ${fileType} not allowed. Allowed types: ${allowedTypes.join(', ')}`
			)
		}
	}

	async uploadFile(
		fileBuffer: Buffer,
		originalName: string,
		fileType: string,
		options?: FileValidationOptions
	): Promise<string> {
		try {
			await this.validateFile(fileBuffer, fileType, options)

			const fileExt = path.extname(originalName)
			const fileName = `${crypto.randomBytes(16).toString('hex')}${fileExt}`
			const filePath = path.join(this.uploadDir, fileName)

			await fs.writeFile(filePath, fileBuffer)
			await this.log('info', '[FILE_UPLOADED]', { originalName, fileName, fileType })

			// Return full URL
			return `/uploads/${fileName}`
		} catch (error) {
			await this.log('error', '[FILE_UPLOAD_ERROR]', { originalName, fileType, error })
			throw error
		}
	}

	async deleteFile(fileUrl: string): Promise<void> {
		if (!fileUrl) return

		try {
			const fileName = fileUrl.replace('/uploads/', '')
			const filePath = path.join(this.uploadDir, fileName)

			await fs.access(filePath)
			await fs.unlink(filePath)
			await this.log('info', '[FILE_DELETED]', { fileUrl })
		} catch (error) {
			await this.log('error', '[FILE_DELETE_ERROR]', { fileUrl, error })
		}
	}

	async listFiles(): Promise<string[]> {
		try {
			const files = await fs.readdir(this.uploadDir)
			const fileUrls = files.map(file => `/uploads/${file}`)
			await this.log('info', '[FILES_LISTED]', { count: files.length })
			return fileUrls
		} catch (error) {
			await this.log('error', '[LIST_FILES_ERROR]', { error })
			throw new Error('Failed to list files')
		}
	}
}
