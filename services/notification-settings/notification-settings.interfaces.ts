import { NotificationSettings } from "@prisma/client";

export interface INotificationSettingsCreateInput extends Omit<NotificationSettings, 'id' | 'createdAt' | 'updatedAt'> {
    userId: string;
}

export interface INotificationSettingsRepository {
    findByUserId(userId: string): Promise<NotificationSettings | null>;
    update(userId: string, data: Partial<INotificationSettingsCreateInput>): Promise<NotificationSettings>;
}

export interface INotificationSettingsFindManyArgs {}