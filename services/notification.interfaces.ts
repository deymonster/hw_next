import { Notification, NotificationSeverity, NotificationType, Prisma } from "@prisma/client";

export interface INotificationCreateInput extends Omit<Notification, 'id' | 'createdAt' | 'updatedAt'> {
    userId: string;
}

export interface INotificationFindManyArgs {
    where?: Prisma.NotificationWhereInput;
    orderBy?: Prisma.NotificationOrderByWithRelationInput;
    take?: number;
    skip?: number;
    include?: Prisma.NotificationInclude;
}

export interface INotificationRepository {
    create(data: INotificationCreateInput): Promise<Notification>;
    findMany(args?: INotificationFindManyArgs): Promise<Notification[]>;
    findById(id: string): Promise<Notification | null>;
    findByUserId(userId: string, take?: number): Promise<Notification[]>;
    markAsRead(id: string): Promise<Notification>;
    markAllAsRead(userId: string): Promise<Prisma.BatchPayload>;
    getUnreadCount(userId: string): Promise<number>;
    delete(id: string): Promise<Notification>;
    deleteMany(userId: string): Promise<Prisma.BatchPayload>;
}
