import crypto from 'crypto'
import path from 'path'

import fs from 'fs/promises'

interface FileValidationOptions {
	maxSize?: number // in bytes
	allowedTypes?: string[] // mime types
}

export class StorageService {
	private readonly uploadDir: string
	private readonly maxFileSize: number
	private readonly allowedFileTypes: string[]

	constructor() {
		this.uploadDir = path.join(process.cwd(), 'storage', 'uploads')
		this.maxFileSize = 20 * 1024 * 1024 // 20MB default
		this.allowedFileTypes = ['image/jpeg', 'image/png', 'image/gif']
		this.initializeStorage()
	}

	private async initializeStorage() {
		try {
			await fs.access(this.uploadDir)
		} catch {
			await fs.mkdir(this.uploadDir, { recursive: true })
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
			throw new Error(`File size exceeds limit of ${maxSize} bytes`)
		}

		const allowedTypes = options?.allowedTypes || this.allowedFileTypes
		if (!allowedTypes.includes(fileType)) {
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
		await this.validateFile(fileBuffer, fileType, options)

		const fileExt = path.extname(originalName)
		const fileName = `${crypto.randomBytes(16).toString('hex')}${fileExt}`
		const filePath = path.join(this.uploadDir, fileName)

		await fs.writeFile(filePath, fileBuffer)

		// Return full URL
		return `/uploads/${fileName}`
	}

	async deleteFile(fileUrl: string): Promise<void> {
		if (!fileUrl) return

		try {
			const fileName = fileUrl.replace('/uploads/', '')
			const filePath = path.join(this.uploadDir, fileName)

			await fs.access(filePath)
			await fs.unlink(filePath)
		} catch (error) {
			console.error(`Failed to delete file: ${fileUrl}`, error)
		}
	}

	async listFiles(): Promise<string[]> {
		try {
			const files = await fs.readdir(this.uploadDir)
			return files.map(file => `/uploads/${file}`)
		} catch (error) {
			console.error('Failed to list files:', error)
			throw new Error('Failed to list files')
		}
	}
}
