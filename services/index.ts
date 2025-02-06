import { prisma } from "@/libs/prisma";
import { UserService } from './user.service';
import { EventService } from './event.service';
import { NotificationFactory } from './notifications/notification.factory';
import { CacheService } from './cache/cache.service';

class ServiceFactory {
    private static instance: ServiceFactory;
    private readonly _user: UserService;
    private readonly _event: EventService;
    private readonly _notifications: NotificationFactory;
    private readonly _cache: CacheService;

    private constructor() {
        this._user = new UserService(prisma);
        this._event = new EventService(prisma);
        this._notifications = new NotificationFactory();
        this._cache = new CacheService();
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
}

// Экспортируем единый экземпляр фабрики сервисов
export const services = ServiceFactory.getInstance();
