import { Notification, PrismaClient } from "@prisma/client";
import { BaseRepository } from "./base.service";
import { INotificationCreateInput, INotificationFindManyArgs, INotificationRepository } from './notification.interfaces';

export class NotificationService 
    extends BaseRepository<Notification, INotificationCreateInput, INotificationFindManyArgs, PrismaClient['notification'], string>
    implements INotificationRepository
{
    constructor(prisma: PrismaClient) {
        super(prisma, (p) => p.notification);
    }

    async findByUserId(userId: string, take: number = 10): Promise<Notification[]> {
        return await this.model.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take
        });
    }

    async markAsRead(id: string): Promise<Notification> {
        try {
            const notification = await this.model.update({
                where: {id},
                data: { isRead: true }
            });
            if (!notification) {
                throw new Error(`Notification with id ${id} not found`);
            }
            return notification;
        } catch (error) {
            console.error(`[MARK_AS_READ_ERROR]`, error);
            throw new Error('Failed to mark notification as read');
        }
    }

    async markAllAsRead(userId: string) {
        try {
            return await this.model.updateMany({
                where: { 
                    userId,
                    isRead: false 
                },
                data: { isRead: true }
            });
        } catch (error) {
            console.error(`[MARK_ALL_AS_READ_ERROR]`, error);
            throw new Error('Failed to mark all notifications as read');
        }
    }

    async getUnreadCount(userId: string): Promise<number> {
        return await this.model.count({
            where: {
                userId,
                isRead: false
            }
        });
    }

    async deleteMany(userId: string) {
        return await this.model.deleteMany({
            where: { userId }
        });
    }
}
