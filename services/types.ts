// services/types.ts
import type { PrismaClient } from '@prisma/client'
import type { UserService } from './user.service'
import type { EventService } from './event.service'
import type { SmtpSettingsService } from './smtp-settings/smtp-settings.service'
import type { TelegramSettingsService } from './telegram-settings/telegram-settings.service'
import type { NotificationSettingsService } from './notification-settings/notification-settings.service'
import type { CacheService } from './cache/cache.service'
import type { NotificationFactory } from './notifications/notification.factory'

export interface IDataServices {
    user: UserService
    event: EventService
    smtp_settings: SmtpSettingsService
    telegram_settings: TelegramSettingsService
    notification_settings: NotificationSettingsService
}

export interface IInfrastructureServices {
    cache: CacheService
    notifications: NotificationFactory
}

export interface IServices {
    data: IDataServices
    infrastructure: IInfrastructureServices
}