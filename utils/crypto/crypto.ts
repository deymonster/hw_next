import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';


console.log('[CRYPTO_MODULE_INIT]', {
    hasKey: !!process.env.ENCRYPTION_KEY,
    keyValue: process.env.ENCRYPTION_KEY
});

const rawKey = process.env.ENCRYPTION_KEY;
if (!rawKey || rawKey.length !== 64) {
    console.error('[CRYPTO_KEY_ERROR]', {
        keyLength: rawKey?.length,
        key: rawKey
    })
    throw new Error('Invalid ENCRYPTION_KEY length. Must be 64 hex characters.');
}

const ENCRYPTION_KEY = Buffer.from(rawKey, 'hex');

const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

export function encrypt(text: string): string {
    console.log('[ENCRYPT_INPUT]', { textLength: text.length });
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const result = `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    console.log('[ENCRYPT_OUTPUT]', { 
        ivLength: iv.length,
        encryptedLength: encrypted.length,
        resultLength: result.length 
    });
    return result;
}

export function decrypt(text: string): string {
    console.log('[DECRYPT_INPUT]', { 
        textLength: text.length,
        hasColon: text.includes(':')
    });
    const [ivHex, encryptedHex] = text.split(':');
    console.log('[DECRYPT_PARTS]', {
        ivHexLength: ivHex?.length,
        encryptedHexLength: encryptedHex?.length
    });
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}