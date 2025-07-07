import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const rawKey = process.env.ENCRYPTION_KEY
if (!rawKey || rawKey.length !== 64) {
	throw new Error('Invalid ENCRYPTION_KEY length. Must be 64 hex characters.')
}

const ENCRYPTION_KEY = Buffer.from(rawKey, 'hex')

const IV_LENGTH = 16
const ALGORITHM = 'aes-256-cbc'

export function encrypt(text: string): string {
	const iv = randomBytes(IV_LENGTH)
	const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
	let encrypted = cipher.update(text)
	encrypted = Buffer.concat([encrypted, cipher.final()])
	const result = `${iv.toString('hex')}:${encrypted.toString('hex')}`

	return result
}

export function decrypt(text: string): string {
	const [ivHex, encryptedHex] = text.split(':')

	const iv = Buffer.from(ivHex, 'hex')
	const encrypted = Buffer.from(encryptedHex, 'hex')
	const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
	let decrypted = decipher.update(encrypted)
	decrypted = Buffer.concat([decrypted, decipher.final()])
	return decrypted.toString()
}
