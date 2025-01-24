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

    async findUnreadByUserId(userId: string): Promise<Notification[]> {
        return await this.model.findMany({
            where: { 
                userId,
                isRead: false 
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findByUserId(userId: string, take: number = 10): Promise<Notification[]> {
        return await this.model.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take
        });
    }

    async findAndMarkAsRead(userId: string, take: number = 10): Promise<Notification[]> {
        // Транзакция для атомарного получения и обновления
        return await this.prisma.$transaction(async (tx) => {
            // Получаем уведомления
            const notifications = await tx.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take
            });

            // Обновляем статус непрочитанных уведомлений
            if (notifications.length > 0) {
                await tx.notification.updateMany({
                    where: { 
                        userId,
                        isRead: false,
                        id: { in: notifications.map(n => n.id) }
                    },
                    data: { isRead: true }
                });
            }

            return notifications;
        });
    }

    async findAndMarkAsReadAll(userId: string): Promise<{ notifications: Notification[], unreadCount: number }> {
        // Транзакция для атомарного получения и обновления
        return await this.prisma.$transaction(async (tx) => {
            // Получаем все уведомления пользователя
            const notifications = await tx.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            });

            // Обновляем статус непрочитанных уведомлений
            const updateResult = await tx.notification.updateMany({
                where: { 
                    userId,
                    isRead: false
                },
                data: { isRead: true }
            });

            return {
                notifications,
                unreadCount: updateResult.count // количество обновленных (бывших непрочитанных) уведомлений
            };
        });
    }

    async getUnreadCount(userId: string): Promise<number> {
        return await this.model.count({
            where: {
                userId,
                isRead: false
            }
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

    async deleteMany(userId: string) {
        return await this.model.deleteMany({
            where: { userId }
        });
    }
}
