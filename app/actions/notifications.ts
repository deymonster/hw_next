'use server'

import { services } from '@/services/index';
import { Notification } from '@prisma/client';

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
    if (!userId) return 0;

    try {
        return await services.notification.getUnreadCount(userId);
    } catch (error) {
        console.error(`[GET_UNREAD_NOTIFICATIONS_COUNT_ERROR]`, error);
        return 0;
    }
}

export async function findUnreadNotifications(userId: string): Promise<{ notifications?: Notification[], error?: string }> {
    if (!userId) {
        return { error: 'User ID is required' };
    }

    try {
        const notifications = await services.notification.findUnreadByUserId(userId);
        return { notifications };
    } catch (error) {
        console.error(`[GET_UNREAD_NOTIFICATIONS_ERROR]`, error);
        return { error: 'Failed to get unread notifications' };
    }
}

export async function findAndMarkAllAsRead(userId: string): Promise<{ 
    notifications?: Notification[], 
    unreadCount?: number,
    error?: string 
}> {
    if (!userId) {
        return { error: 'User ID is required' };
    }

    try {
        const result = await services.notification.findAndMarkAsReadAll(userId);
        return { 
            notifications: result.notifications,
            unreadCount: result.unreadCount
        };
    } catch (error) {
        console.error(`[MARK_ALL_AS_READ_ERROR]`, error);
        return { error: 'Failed to mark notifications as read' };
    }
}