'use server'

import nodemailer from 'nodemailer'
import { z } from 'zod'

import { prisma } from '@/libs/prisma'
import { decrypt } from '@/utils/crypto/crypto'

// Схема для проверки SMTP-конфигурации
const smtpConfigSchema = z.object({
	SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
	SMTP_PORT: z.string().regex(/^\d+$/, 'SMTP_PORT must be a number'),
	SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
	SMTP_PASSWORD: z.string().min(1, 'SMTP_PASSWORD is required'),
	SMTP_FROM_EMAIL: z.string().email('SMTP_FROM_EMAIL must be a valid email'),
	SMTP_FROM_NAME: z.string().min(1, 'SMTP_FROM_NAME is required')
})

// Переменная для хранения конфигурации
let smtpConfigData: z.infer<typeof smtpConfigSchema> | null = null

// Функция для проверки и инициализации SMTP-конфигурации
const getEnvSmtpConfig = () => {
	if (smtpConfigData) return smtpConfigData

	// Проверка переменных окружения
	const smtpConfig = smtpConfigSchema.safeParse(process.env)

	if (!smtpConfig.success) {
		console.warn('⚠️ No valid SMTP configuration in .env')
		return null
	}

	smtpConfigData = smtpConfig.data
	return smtpConfigData
}

// Функция получения настроек из БД (от первого администратора)
const getDbSmtpConfig = async () => {
	try {
		const adminSmtp = await prisma.smtpSettings.findFirst({
			where: {
				user: {
					role: 'ADMIN'
				}
			}
		})

		if (adminSmtp) {
			return {
				host: adminSmtp.host,
				port: adminSmtp.port,
				secure: adminSmtp.secure,
				user: adminSmtp.username,
				password: decrypt(adminSmtp.password),
				fromEmail: adminSmtp.fromEmail,
				fromName: adminSmtp.fromName || 'NITRINOnet Monitoring System'
			}
		}
	} catch (error) {
		console.error('Error fetching SMTP settings from DB:', error)
	}
	return null
}

// Функция отправки почты
export async function sendMail({
	email, // Переопределяет SMTP_FROM_EMAIL, если указан
	sendTo,
	subject,
	text,
	html
}: {
	email?: string // Отправитель (опционально, используется SMTP_FROM_EMAIL по умолчанию)
	sendTo: string // Получатель
	subject: string // Тема письма
	text: string // Текстовое содержание
	html?: string // HTML-содержание (опционально)
}) {
	let transporterConfig = null
	let fromAddress = ''

	// Сначала пытаемся получить настройки из БД
	const dbConfig = await getDbSmtpConfig()

	if (dbConfig) {
		transporterConfig = {
			host: dbConfig.host,
			port: dbConfig.port,
			secure: dbConfig.secure,
			auth: {
				user: dbConfig.user,
				pass: dbConfig.password
			}
		}
		fromAddress = email
			? email
			: `${dbConfig.fromName} <${dbConfig.fromEmail}>`
	} else {
		// Если в БД нет, используем .env
		const envConfig = getEnvSmtpConfig()
		if (!envConfig) {
			throw new Error(
				'Invalid SMTP configuration. Neither DB nor .env has valid settings.'
			)
		}
		transporterConfig = {
			host: envConfig.SMTP_HOST,
			port: parseInt(envConfig.SMTP_PORT, 10),
			secure: false, // Если порт 587 (для STARTTLS)
			auth: {
				user: envConfig.SMTP_USER,
				pass: envConfig.SMTP_PASSWORD
			}
		}
		fromAddress = email
			? email
			: `${envConfig.SMTP_FROM_NAME} <${envConfig.SMTP_FROM_EMAIL}>`
	}

	const transporter = nodemailer.createTransport(
		transporterConfig as nodemailer.TransportOptions
	)

	try {
		// Проверяем доступность SMTP-сервера
		await transporter.verify()
	} catch (error: any) {
		console.error('Error verifying SMTP server:', error.message)
		throw new Error(`Error verifying SMTP server: ${error.message}`)
	}

	try {
		const info = await transporter.sendMail({
			from: fromAddress,
			to: sendTo,
			subject,
			text,
			html: html || '' // Если html не передан, используем пустую строку
		})

		console.log('Message sent: %s', info.messageId)
		console.log('Mail sent to', sendTo)
		return info
	} catch (error: any) {
		console.error('Error sending email:', error.message)
		throw new Error(`Error sending email: ${error.message}`)
	}
}
