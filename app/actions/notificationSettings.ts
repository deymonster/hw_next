'use server'

import { services } from '@/services/index';
import type { SmtpProvider } from '@prisma/client';


export interface NotificationServicesState {
    notifications: {
        emailNotification: boolean;
        siteNotification: boolean;
        telegramNotification: boolean;
    };
    smtpSettings: {
        isVerified: boolean;
        provider: SmtpProvider;
        host: string;
        port: number;
        secure: boolean;
        username: string;
        password: string;
        fromEmail: string;
        fromName: string | null;
        lastTestAt: Date | null;
    };
    telegramSettings: {
        isActive: boolean;
        botToken: string;
        telegramChatId: string | null;
        username: string | null;
        firstName: string | null;
        lastInteractionAt: Date | null;
    }

}

export interface UpdateNotificationSettingsInput {
    emailNotification?: boolean;
    siteNotification?: boolean;
    telegramNotification?: boolean;
}

export async function getNotificationSettings(userId: string): Promise<NotificationServicesState | null> {
    const [notificationSettings, smtpSettings, telegramSettings] = await Promise.all([
        services.notification_settings.findByUserId(userId),
        services.smtp_settings.findByUserId(userId),
        services.telegram_settings.findByUserId(userId),
    ])

    if (!notificationSettings || !smtpSettings || !telegramSettings) {
        return null
    }
   

    return {
        notifications: {
            emailNotification: notificationSettings.emailNotification,
            siteNotification: notificationSettings.siteNotification,
            telegramNotification: notificationSettings.telegramNotification,
        },
        smtpSettings: {
            isVerified: smtpSettings.isVerified,
            provider: smtpSettings.provider,
            host: smtpSettings.host,
            port: smtpSettings.port,
            secure: smtpSettings.secure,
            username: smtpSettings.username,
            password: smtpSettings.password,
            fromEmail: smtpSettings.fromEmail,
            fromName: smtpSettings.fromName,
            lastTestAt: smtpSettings.lastTestAt,
        },
        telegramSettings: {
            isActive: telegramSettings.isActive,
            botToken: telegramSettings.botToken,
            telegramChatId: telegramSettings.telegramChatId,
            username: telegramSettings.username,
            firstName: telegramSettings.firstName,
            lastInteractionAt: telegramSettings.lastInteractionAt,
        }
    }
}

export async function updateNotificationSettings(userId: string,data: UpdateNotificationSettingsInput): Promise<{success: boolean; error?:string}>{
    try {
        await services.notification_settings.update(userId, data)
        return {
            success: true,
        }
    } catch (error) {
        console.error('[UPDATE_NOTIFICATION_SETTINGS_ERROR]', error)
        return {
            success: false,
            error: 'Failed to update notification settings'
        }
    }
}

export async function createDefaultNotificationSettings(userId: string): Promise<NotificationServicesState> {
    // Проверяем существующие настройки
    const [existingNotificationSettings, existingSmtpSettings, existingTelegramSettings] = 
        await Promise.all([
            services.notification_settings.findByUserId(userId),
            services.smtp_settings.findByUserId(userId),
            services.telegram_settings.findByUserId(userId)
        ]);
    
    // Создаем только те настройки, которых нет
    const createPromises = [];

    if (!existingNotificationSettings) {
        const defaultNotificationSettings = {
            emailNotification: false,
            siteNotification: true,
            telegramNotification: false,
            userId
        };
        createPromises.push(services.notification_settings.create(defaultNotificationSettings));
    }

    if (!existingSmtpSettings) {
        const defaultSmtpSettings = {
            isVerified: false,
            provider: 'CUSTOM' as SmtpProvider,
            host: '',
            port: 587,
            secure: false,
            username: '',
            password: '',
            fromEmail: '',
            fromName: null,
            lastTestAt: null,
            userId
        };
        createPromises.push(services.smtp_settings.create(defaultSmtpSettings));
    }

    if (!existingTelegramSettings) {
        const defaultTelegramSettings = {
            isActive: false,
            botToken: '',
            telegramChatId: null,
            username: null,
            firstName: null,
            lastInteractionAt: null,
            userId
        };
        createPromises.push(services.telegram_settings.create(defaultTelegramSettings));
    }

    if (createPromises.length > 0) {
        await Promise.all(createPromises);
    }
    
    const settings = await getNotificationSettings(userId);
    if (!settings) {
        throw new Error('Failed to create notification settings');
    }
    
    return settings;
}