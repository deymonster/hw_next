import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const IV_LENGTH = 16
const ALGORITHM = 'aes-256-cbc'

function getEncryptionKey(): Buffer {
	const rawKey = process.env.ENCRYPTION_KEY
	if (!rawKey) {
		throw new Error('Missing ENCRYPTION_KEY env variable.')
	}
	if (rawKey.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(rawKey)) {
		throw new Error(
			'Invalid ENCRYPTION_KEY format. Must be 64 hex characters.'
		)
	}
	return Buffer.from(rawKey, 'hex')
}

export function encrypt(text: string): string {
	const iv = randomBytes(IV_LENGTH)
	const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
	let encrypted = cipher.update(text)
	encrypted = Buffer.concat([encrypted, cipher.final()])
	const result = `${iv.toString('hex')}:${encrypted.toString('hex')}`
	return result
}

export function decrypt(text: string): string {
	const [ivHex, encryptedHex] = text.split(':')

	const iv = Buffer.from(ivHex, 'hex')
	const encrypted = Buffer.from(encryptedHex, 'hex')
	const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
	let decrypted = decipher.update(encrypted)
	decrypted = Buffer.concat([decrypted, decipher.final()])
	return decrypted.toString()
}
