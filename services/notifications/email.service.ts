import nodemailer from 'nodemailer';
import { BaseNotificationService } from './base.notification.service';
import { EmailPayload, SmtpConfig } from './types';
import { decrypt } from '@/utils/crypto/crypto';
import { changeEmailTemplate } from './templates/changeEmail'
import { verifyEmailTemplate } from './templates/verifyEmail'

export class EmailService extends BaseNotificationService {
    
    private fromName: string;

    constructor() {
        super();

        if (!process.env.SMTP_HOST) throw new Error('SMTP_HOST is not defined');
        if (!process.env.SMTP_PORT) throw new Error('SMTP_PORT is not defined');
        if (!process.env.SMTP_USER) throw new Error('SMTP_USER is not defined');
        if (!process.env.SMTP_PASSWORD) throw new Error('SMTP_PASSWORD is not defined');
        if (!process.env.SMTP_FROM_EMAIL) throw new Error('SMTP_FROM_EMAIL is not defined');
        
        
        this.fromName = process.env.SMTP_FROM_NAME || 'NITRINOnet Monitoring System';
        
    }
    // Метод для отправки с системными настройками из env
    async send(payload: EmailPayload): Promise<boolean> {
        try {
            if (!('to' in payload)) {
                console.error('[EMAIL_SERVICE_ERROR] No recipient specified');
                return false;
            }
            const emailPayload = payload as EmailPayload

            const systemConfig: SmtpConfig = {
                host: process.env.SMTP_HOST!,
                port: Number(process.env.SMTP_PORT!),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER!,
                    encryptedPassword: process.env.SMTP_PASSWORD!
                },
                fromEmail: process.env.SMTP_FROM_EMAIL!,
                fromName: process.env.SMTP_FROM_NAME || this.fromName
            }

            return this.sendWithConfig(systemConfig, emailPayload)
        } catch (error) {
            console.error('[EMAIL_SERVICE_ERROR]', error)
            return false
        }
    }

    private async createTransporter(config: SmtpConfig) {
        const decryptedPassword = decrypt(config.auth.encryptedPassword)
        return nodemailer.createTransport({
            
            port: config.port,
            host: config.host,
            secure: config.secure,
            auth: {
                user: config.auth.user,
                pass: decryptedPassword
            }
        } as nodemailer.TransportOptions)
    }


    async sendWithConfig(config: SmtpConfig, payload: EmailPayload): Promise<boolean> {
        try {

            const transporter = await this.createTransporter(config)
            
            await transporter.sendMail({
                from: {
                    name: config.fromName || this.fromName,
                    address: config.fromEmail
                },
                to: payload.to,
                subject: payload.subject || '',
                text: payload.text,
                html: payload.html || payload.text,
            })

            return true
            
        } catch (error) {
            console.error('[EMAIL_SERVICE_ERROR]', error);
            return false;
        }
    }

    async sendChangeEmailVerification(
        currentEmail: string,
        newEmail: string,
        code: string
    ): Promise<boolean> {
        return this.send({
            to: newEmail,
            subject: 'Изменение email',
            text: `Ваш код проверки: ${code}`,
            html: changeEmailTemplate(currentEmail, newEmail, code),
        });
    }

    async sendEmailVerification(email: string, code: string): Promise<boolean> {
        return this.send({
            to: email,
            subject: 'Подтверждение email',
            text: `Ваш код проверки: ${code}`,
            html: verifyEmailTemplate(code),
        });
    }

    async sendCustomEmail(
        config: SmtpConfig,
        to: string,
        subject: string,
        text: string,
        html?: string
    ): Promise<boolean> {
        return this.sendWithConfig(config, {
            to,
            subject,
            text,
            html: html || text
        })
    }

    async verifyConnection(config: {
        host: string
        port: number
        secure: boolean
        auth: {
            user: string
            encryptedPassword: string
        }
    }): Promise<boolean> {
        try {
            console.log('[VERIFY_CONNECTION_INPUT]', {
                host: config.host,
                port: config.port,
                secure: config.secure,
                auth: {
                    user: config.auth.user,
                    // логируем длину зашифрованного пароля
                    passwordLength: config.auth.encryptedPassword?.length,
                    // первые несколько символов для проверки формата
                    passwordStart: config.auth.encryptedPassword?.substring(0, 10)
                }
            });
            const decryptedPassword = decrypt(config.auth.encryptedPassword)
            const testTransporter = nodemailer.createTransport({
                ...config,
                auth: {
                    user: config.auth.user,
                    pass: decryptedPassword
                }
            })
            await testTransporter.verify()
            return true
        } catch (error) {
            console.error('[SMTP_VERIFY_ERROR]', error)
            throw error instanceof Error ? error : new Error('SMTP verification failed')
        }
    }
}
