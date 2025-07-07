import nodemailer from 'nodemailer'

export async function validateConfig() {
	const requiredEnvVars = [
		'SMTP_HOST',
		'SMTP_PORT',
		'SMTP_USER',
		'SMTP_PASSWORD',
		'SMTP_FROM_EMAIL',
		'SMTP_FROM_NAME',
		'ADMIN_EMAIL'
	]

	const missing = requiredEnvVars.filter(envVar => !process.env[envVar])

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}\n` +
				'Please check your .env file and add all required variables.'
		)
	}

	// Валидация формата значений
	const port = parseInt(process.env.SMTP_PORT || '')
	if (isNaN(port)) {
		throw new Error('SMTP_PORT must be a valid number')
	}

	const secure = process.env.SMTP_SECURE?.toLowerCase()
	if (secure !== 'true' && secure !== 'false') {
		throw new Error('SMTP_SECURE must be either "true" or "false"')
	}

	// Валидация email
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	if (!emailRegex.test(process.env.ADMIN_EMAIL || '')) {
		throw new Error('ADMIN_EMAIL must be a valid email address')
	}
	if (!emailRegex.test(process.env.SMTP_FROM_EMAIL || '')) {
		throw new Error('SMTP_FROM_EMAIL must be a valid email address')
	}

	// Проверка доступности SMTP-сервера
	const transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port,
		secure: secure === 'true',
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASSWORD
		}
	})

	try {
		await transporter.verify()
	} catch (error: any) {
		throw new Error(
			`SMTP server validation failed: ${error.message}\n` +
				'Please check your SMTP configuration in .env file.'
		)
	}
}
