import { SmtpSettings, SmtpProvider, Prisma } from "@prisma/client";

export type ISmtpSettingsCreateInput = Prisma.SmtpSettingsCreateInput;

export interface ISmtpSettingsFindManyArgs {}

export interface ISmtpSettingsRepository {
    update(userId: string, data: Partial<ISmtpSettingsCreateInput>): Promise<SmtpSettings>;
    findByUserId(userId: string): Promise<SmtpSettings | null>;
}

// Константы провайдеров с обязательными полями
export const SMTP_PROVIDER_DEFAULTS: Record<SmtpProvider, Required<Pick<ISmtpSettingsCreateInput, 'host' | 'port' | 'secure'>>> = {
    GMAIL: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false
    },
    YANDEX: {
        host: 'smtp.yandex.ru',
        port: 465,
        secure: true
    },
    MAIL: {
        host: 'smtp.mail.ru',
        port: 465,
        secure: true
    },
    CUSTOM: {
        host: '',
        port: 465,
        secure: true
    }
}