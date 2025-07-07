'use server'

import { Event } from '@prisma/client'

import { services } from '@/services/index'

export async function getUnreadEventCount(userId: string): Promise<number> {
	if (!userId) return 0

	try {
		return await services.data.event.getUnreadCount(userId)
	} catch (error) {
		console.error(`[GET_UNREAD_EVENT_COUNT_ERROR]`, error)
		return 0
	}
}

export async function findUnreadEvents(
	userId: string
): Promise<{ events?: Event[]; error?: string }> {
	if (!userId) {
		return { error: 'User ID is required' }
	}

	try {
		const events = await services.data.event.findUnreadByUserId(userId)
		return { events }
	} catch (error) {
		console.error(`[GET_UNREAD_EVENTS_ERROR]`, error)
		return { error: 'Failed to get unread notifications' }
	}
}

export async function findAndMarkAllAsRead(userId: string): Promise<{
	events?: Event[]
	unreadCount?: number
	error?: string
}> {
	if (!userId) {
		return { error: 'User ID is required' }
	}

	try {
		const result = await services.data.event.findAndMarkAsReadAll(userId)
		return {
			events: result.events,
			unreadCount: result.unreadCount
		}
	} catch (error) {
		console.error(`[MARK_ALL_AS_READ_ERROR]`, error)
		return { error: 'Failed to mark events as read' }
	}
}

export async function markEventAsRead(eventId: string): Promise<{
	event?: Event
	error?: string
}> {
	if (!eventId) {
		return { error: 'Event ID is required' }
	}

	try {
		const event = await services.data.event.markAsRead(eventId)
		return { event }
	} catch (error) {
		console.error(`[MARK_EVENT_AS_READ_ERROR]`, error)
		return { error: 'Failed to mark event as read' }
	}
}

export async function findAllEvents(
	userId: string,
	options?: {
		take?: number
		skip?: number
		orderBy?: string
		orderDir?: 'asc' | 'desc'
	}
): Promise<{
	events?: Event[]
	total?: number
	error?: string
}> {
	if (!userId) {
		return { error: 'User ID is required' }
	}

	try {
		const events = await services.data.event.findByUserId(userId, options)

		// Получаем общее количество событий для пагинации
		const total = await services.data.event.count({ userId })

		return { events, total }
	} catch (error) {
		console.error(`[FIND_ALL_EVENTS_ERROR]`, error)
		return { error: 'Failed to get events' }
	}
}
