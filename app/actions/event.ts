'use server'

import { services } from '@/services/index';
import { Event } from '@prisma/client';

export async function getUnreadEventCount(userId: string): Promise<number> {
    if (!userId) return 0;

    try {
        return await services.event.getUnreadCount(userId);
    } catch (error) {
        console.error(`[GET_UNREAD_EVENT_COUNT_ERROR]`, error);
        return 0;
    }
}

export async function findUnreadEvents(userId: string): Promise<{ events?: Event[], error?: string }> {
    if (!userId) {
        return { error: 'User ID is required' };
    }

    try {
        const events = await services.event.findUnreadByUserId(userId);
        return { events };
    } catch (error) {
        console.error(`[GET_UNREAD_EVENTS_ERROR]`, error);
        return { error: 'Failed to get unread notifications' };
    }
}

export async function findAndMarkAllAsRead(userId: string): Promise<{ 
    events?: Event[], 
    unreadCount?: number,
    error?: string 
}> {
    if (!userId) {
        return { error: 'User ID is required' };
    }

    try {
        const result = await services.event.findAndMarkAsReadAll(userId);
        return { 
            events: result.events,
            unreadCount: result.unreadCount
        };
    } catch (error) {
        console.error(`[MARK_ALL_AS_READ_ERROR]`, error);
        return { error: 'Failed to mark events as read' };
    }
}