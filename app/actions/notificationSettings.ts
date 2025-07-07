'use server'

import { services } from '@/services/index'

export interface NotificationSettingsState {
	siteNotification: boolean
	telegramNotification: boolean
}

export interface UpdateNotificationSettingsInput {
	siteNotification?: boolean
	telegramNotification?: boolean
}

export async function getNotificationSettings(
	userId: string
): Promise<NotificationSettingsState | null> {
	const notificationSettings =
		await services.data.notification_settings.findByUserId(userId)

	if (!notificationSettings) {
		return null
	}

	return {
		siteNotification: notificationSettings.siteNotification,
		telegramNotification: notificationSettings.telegramNotification
	}
}

export async function updateNotificationSettings(
	userId: string,
	data: UpdateNotificationSettingsInput
): Promise<{ success: boolean; error?: string }> {
	try {
		if (!Object.keys(data).length) {
			return {
				success: false,
				error: 'No settings provided for update'
			}
		}

		await services.data.notification_settings.update(userId, data)
		return {
			success: true
		}
	} catch (error) {
		console.error('[UPDATE_NOTIFICATION_SETTINGS_ERROR]', error)
		return {
			success: false,
			error: 'Failed to update notification settings'
		}
	}
}

export async function createDefaultNotificationSettings(
	userId: string
): Promise<NotificationSettingsState> {
	const existingSettings =
		await services.data.notification_settings.findByUserId(userId)

	if (!existingSettings) {
		const defaultNotificationSettings = {
			siteNotification: true,
			telegramNotification: false,
			userId
		}
		await services.data.notification_settings.create(
			defaultNotificationSettings
		)
	}

	const settings = await getNotificationSettings(userId)
	if (!settings) {
		throw new Error('Failed to create notification settings')
	}

	return settings
}
