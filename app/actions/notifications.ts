'use server'

import { services } from '@/services/index';
import { Notification } from '@prisma/client';

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
    try {
        return await services.notification.getUnreadCount(userId);
    } catch (error) {
        console.error(`[GET_UNREAD_NOTIFICATIONS_COUNT_ERROR]`, error);
        throw new Error('Failed to get unread notifications count');
    }
}

export async function findNotificationsByUser(userId: string): Promise<{ notifications?: Notification[], error?: string }> {
    if (!userId) {
        return { error: 'User ID is required' };
    }

    try {
        const notifications = await services.notification.findByUserId(userId);
        return { notifications };
    } catch (error) {
        console.error(`[GET_NOTIFICATIONS_BY_USER_ERROR]`, error);
        return { error: 'Failed to get notifications' };
    }
}