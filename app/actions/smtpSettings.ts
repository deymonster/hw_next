'use server'

import { services } from "@/services"
import { encrypt } from '@/utils/crypto/crypto';
import type { SmtpProvider, SmtpSettings } from "@prisma/client"
import {  
    ISmtpSettingsCreateInput, 
    SMTP_PROVIDER_DEFAULTS 
} from '@/services/smtp-settings/smtp-settiings.constants'



export async function getSmtpSettings(userId: string): Promise<SmtpSettings | null> {
    const smtpSettings = await services.data.smtp_settings.findByUserId(userId)

    if (!smtpSettings) {
        return null
    }

    return smtpSettings
}

export async function updateSmtpSettings(userId: string, data: Partial<Omit<SmtpSettings, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>): Promise<{success: boolean, error?:string}>{
    try {
        if (!Object.keys(data).length) {
            return {
                success: false,
                error: 'No data provided'
            }
        }
        if (data.password) {
            data.password = encrypt(data.password)
        }
        await services.data.smtp_settings.update(userId, data)
        return {
            success: true
        }
    } catch (error) {
        console.error('[UPDATE_SMTP_SETTINGS_ERROR]', error)
        return {
            success: false,
            error: 'Failed to update smtp settings'
        }
    }
}

export async function createDefaultSmtpSettings(userId: string, provider: SmtpProvider = 'CUSTOM'): Promise<SmtpSettings> {
    const existingSmtpSettings = await services.data.smtp_settings.findByUserId(userId)

    if (!existingSmtpSettings) {
        const defaultSmtpSettings: ISmtpSettingsCreateInput = {
            isVerified: false,
            provider, 
            ...SMTP_PROVIDER_DEFAULTS[provider],
            username: '',
            password: '',
            fromEmail: '',
            fromName: null,
            lastTestAt: null,
            user: {
                connect: {
                    id: userId
                }
            }
        }
        await services.data.smtp_settings.create(defaultSmtpSettings)
    }
    const settings = await getSmtpSettings(userId)
    if (!settings) {
        throw new Error('Failed to create default smtp settings')
    }
    return settings
    
}

export async function verifySmtpConnection(config: Pick<SmtpSettings, 'host' | 'port' | 'secure' | 'username' | 'password'>): Promise<{success:  boolean, error?: string}> {
    try {

        const encryptedPassword = encrypt(config.password);
        const isValid = await services.infrastructure.notifications.email.verifyConnection({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.username,
                encryptedPassword: encryptedPassword
            }
        })

        return {
            success: isValid,
            error: isValid ? undefined : 'Failed to connect to SMTP server'
        }
    } catch (error) {
        console.error('[VERIFY_SMTP_CONNECTION_ERROR]', error)
        if (error instanceof Error) {
            if (error.message.includes('ECONNREFUSED')) {
                return {
                    success: false,
                    error: 'Could not connect to SMTP server. Please check host and port'
                }
            }
            if (error.message.includes('Invalid login')) {
                return {
                    success: false,
                    error: 'Invalid SMTP credentials. Please check username and password'
                }
            }
            if (error.message.includes('certificate')) {
                return {
                    success: false,
                    error: 'SSL/TLS certificate error. Try changing the "secure" option'
                }
            }
            // Возвращаем оригинальное сообщение об ошибке, если оно есть
            return {
                success: false,
                error: error.message
            }
        }
        return {
            success: false,
            error: 'Failed to verify SMTP connection'
        }
    }
}





