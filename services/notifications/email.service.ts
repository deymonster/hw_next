import nodemailer from 'nodemailer';
import { BaseNotificationService } from './base.notification.service';
import { EmailPayload } from './types';

export class EmailService extends BaseNotificationService {
    private transporter: nodemailer.Transporter;
    private fromEmail: string;
    private fromName: string;

    constructor() {
        super();

        if (!process.env.SMTP_HOST) throw new Error('SMTP_HOST is not defined');
        if (!process.env.SMTP_PORT) throw new Error('SMTP_PORT is not defined');
        if (!process.env.SMTP_USER) throw new Error('SMTP_USER is not defined');
        if (!process.env.SMTP_PASSWORD) throw new Error('SMTP_PASSWORD is not defined');
        if (!process.env.SMTP_FROM_EMAIL) throw new Error('SMTP_FROM_EMAIL is not defined');
        
        this.fromEmail = process.env.SMTP_FROM_EMAIL;
        this.fromName = process.env.SMTP_FROM_NAME || 'NITRINOnet Monitoring System';

        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });
    }

    async send(payload: EmailPayload): Promise<boolean> {
        try {
            await this.transporter.sendMail({
                from: {
                    name: this.fromName,
                    address: this.fromEmail
                },
                to: payload.to,
                subject: payload.subject,
                text: payload.text,
                html: payload.html,
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
}
