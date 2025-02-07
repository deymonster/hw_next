import { prisma } from "@/libs/prisma";
import { UserService } from './user.service';
import { EventService } from './event.service';
import { NotificationFactory } from './notifications/notification.factory';
import { CacheService } from './cache/cache.service';
import { SmtpSettingsService} from './smtp-settings/smtp-settings.service';
import { TelegramSettingsService} from './telegram-settings/telegram-settings.service';
import { NotificationSettingsService } from './notification-settings/notification-settings.service'
 

class ServiceFactory {
    private static instance: ServiceFactory;
    private readonly _user: UserService;
    private readonly _event: EventService;
    private readonly _notifications: NotificationFactory;
    private readonly _cache: CacheService;
    private readonly _smtp_settings: SmtpSettingsService;
    private readonly _telegram_settings: TelegramSettingsService;
    private readonly _notification_settings: NotificationSettingsService;

    private constructor() {
        this._user = new UserService(prisma);
        this._event = new EventService(prisma);
        this._notifications = new NotificationFactory();
        this._cache = new CacheService();
        this._smtp_settings = new SmtpSettingsService(prisma);
        this._telegram_settings = new TelegramSettingsService(prisma);
        this._notification_settings = new NotificationSettingsService(prisma);
    }

    public static getInstance(): ServiceFactory {
        if (!ServiceFactory.instance) {
            ServiceFactory.instance = new ServiceFactory();
        }
        return ServiceFactory.instance;
    }

    get user() {
        return this._user;
    }

    get event() {
        return this._event;
    }

    get notifications() {
        return this._notifications;
    }

    get cache() {
        return this._cache;
    }

    get smtp_settings() {
        return this._smtp_settings;
    }

    get telegram_settings() {
        return this._telegram_settings;
    }

    get notification_settings() {
        return this._notification_settings;
    }
}

// Экспортируем единый экземпляр фабрики сервисов
export const services = ServiceFactory.getInstance();
