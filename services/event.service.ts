import { Event, Prisma, PrismaClient } from "@prisma/client";
import { BaseRepository } from "./base.service";
import { IEventCreateInput, IEventFindManyArgs, IEventRepository } from './event.interfaces';

export class EventService 
    extends BaseRepository<Event, IEventCreateInput, IEventFindManyArgs, PrismaClient['event'], string>
    implements IEventRepository
{
    constructor(prisma: PrismaClient) {
        super(prisma, (p) => p.event);
    }

    async findUnreadByUserId(userId: string): Promise<Event[]> {
        return await this.model.findMany({
            where: { 
                userId,
                isRead: false 
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findByUserId(userId: string, 
            options?: {
                take?: number,
                skip?: number,
                orderBy?: string,
                orderDir?: 'asc' | 'desc'
        }): Promise<Event[]> {
        const { take = 10, skip = 0, orderBy = 'createdAt', orderDir = 'desc' } = options || {};
        
        return await this.model.findMany({
            where: { userId },
            orderBy: { [orderBy]: orderDir },
            take,
            skip
        });
    }

    async count(where?: Prisma.EventWhereInput): Promise<number> {
        return await this.model.count({ where })
    }

    async findAndMarkAsRead(userId: string, take: number = 10): Promise<Event[]> {
        // Транзакция для атомарного получения и обновления
        return await this.prisma.$transaction(async (tx) => {
            // Получаем уведомления
            const notifications = await tx.event.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take
            });

            // Обновляем статус непрочитанных уведомлений
            if (notifications.length > 0) {
                await tx.event.updateMany({
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

    async findAndMarkAsReadAll(userId: string): Promise<{ events: Event[], unreadCount: number }> {
        // Транзакция для атомарного получения и обновления
        return await this.prisma.$transaction(async (tx) => {
            // Получаем все уведомления пользователя
            const events = await tx.event.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            });

            // Обновляем статус непрочитанных уведомлений
            const updateResult = await tx.event.updateMany({
                where: { 
                    userId,
                    isRead: false
                },
                data: { isRead: true }
            });

            return {
                events,
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

    async markAsRead(id: string): Promise<Event> {
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
