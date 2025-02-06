import { NotificationSettings, PrismaClient } from "@prisma/client";
import { BaseRepository } from "@/services/base.service";
import { INotificationSettingsCreateInput, INotificationSettingsRepository, INotificationSettingsFindManyArgs } from "./notification-settings.interfaces";

export class NotificationSettingsService
    extends BaseRepository<NotificationSettings, INotificationSettingsCreateInput, INotificationSettingsFindManyArgs, PrismaClient['notificationSettings'], string>
    implements INotificationSettingsRepository
{
    constructor(prisma: PrismaClient) {
        super(prisma, (p) => p.notificationSettings);
    }


    async findByUserId(userId: string): Promise<NotificationSettings | null> {
        return this.model.findUnique({
            where: { userId }
        });
    }

    async update(userId: string, data: Partial<INotificationSettingsCreateInput>): Promise<NotificationSettings> {
        return this.model.update({
            where: { userId },
            data
        });
    }
}