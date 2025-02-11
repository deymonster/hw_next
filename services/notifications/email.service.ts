import nodemailer from 'nodemailer';
import { BaseNotificationService } from './base.notification.service';
import { EmailPayload, NotificationPayload, SmtpConfig } from './types';
import { decrypt } from '@/utils/crypto/crypto';

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

    private async createTransporter(config: SmtpConfig) {
        const decryptedPassword = decrypt(config.auth.encryptedPassword)
        return nodemailer.createTransport({
            service: undefined,
            port: config.port,
            host: config.host,
            secure: config.secure,
            auth: {
                user: config.auth.user,
                pass: decryptedPassword
            }
        } as nodemailer.TransportOptions)
    }

    async send(payload: NotificationPayload): Promise<boolean> {
        try {
            if (!('to' in payload)) {
                console.error('[EMAIL_SERVICE_ERROR] No recipient specified');
                return false;
            }
            const emailPayload = payload as EmailPayload;
            
            // Используем системные настройки из .env
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
            };

            const transporter = await this.createTransporter(systemConfig);
            await transporter.sendMail({
                from: {
                    name: systemConfig.fromName || this.fromName,
                    address: systemConfig.fromEmail
                },
                to: emailPayload.to,
                subject: emailPayload.subject || '',
                text: emailPayload.text,
                html: emailPayload.html || emailPayload.text,
            });
            return true;
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
        const html = `
            <h1>Запрос на смену email</h1>
            <p>Вами было запрошено изменение адреса электронной почты  с ${currentEmail} на ${newEmail}.</p>
            <p>Ваш код проверки: <strong>${code}</strong></p>
            <p>Код действителен в течении 15 минут.</p>
            <p>Если вы не запрашивали смены адреса почты,  пожалуйста проигнорируйте данное сообщение.</p>
        `;

        return this.send({
            to: currentEmail,
            subject: 'Уведомление о смене адреса почты',
            text: `Ваш код проверки: ${code}`,
            html,
        });
    }

    async sendEmailVerification(email: string, code: string): Promise<boolean> {
        const html = `
            <h1>Проверка email</h1>
            <p>Ваш код проверки: <strong>${code}</strong></p>
            <p>Код действителен в течении 15 минут.</p>
        `;

        return this.send({
            to: email,
            subject: 'Проверка email',
            text: `Ваш код проверки: ${code}`,
            html,
        });
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
            return false
        }
    }
}
