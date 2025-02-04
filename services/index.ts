import { prisma } from "@/libs/prisma";
import { UserService } from './user.service';
import { NotificationService} from './notification.service';
import { NotificationFactory } from './notifications/notification.factory';
import { CacheService } from './cache/cache.service';

class ServiceFactory {
    private static instance: ServiceFactory;
    private readonly _user: UserService;
    private readonly _notification: NotificationService;
    private readonly _notifications: NotificationFactory;
    private readonly _cache: CacheService;

    private constructor() {
        this._user = new UserService(prisma);
        this._notification = new NotificationService(prisma);
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

    get notification() {
        return this._notification
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
