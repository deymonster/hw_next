import { SmtpSettings } from "@prisma/client";

export interface ISmtpSettingsCreateInput extends Omit<SmtpSettings, 'id' | 'createdAt' | 'updatedAt'> {
    userId: string
}

export interface ISmtpSettingsFindManyArgs {}

export interface ISmtpSettingsRepository {
    update(userId: string, data: Partial<ISmtpSettingsCreateInput>): Promise<SmtpSettings>;
    findByUserId(userId: string): Promise<SmtpSettings | null>;
}