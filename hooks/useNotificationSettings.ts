import { useSession } from 'next-auth/react'
import { useCallback, useState } from 'react'

import {
	createDefaultNotificationSettings,
	getNotificationSettings,
	updateNotificationSettings
} from '@/app/actions/notificationSettings'
import type {
	NotificationSettingsState,
	UpdateNotificationSettingsInput
} from '@/app/actions/notificationSettings'

interface CallbackOptions {
	onSuccess?: () => void
	onError?: (error: unknown) => void
}

export function useNotificationSettings() {
	const { data: session, status } = useSession()
	const user = session?.user
	const isSessionLoading = status === 'loading'

	const [settings, setSettings] = useState<NotificationSettingsState | null>(
		null
	)

	const fetchSettings = useCallback(
		async ({ onSuccess, onError }: CallbackOptions = {}) => {
			if (!user?.id) return null

			try {
				let result = await getNotificationSettings(user.id)

				if (!result) {
					result = await createDefaultNotificationSettings(user.id)
				}
				setSettings(result)
				onSuccess?.()
				return result
			} catch (error) {
				console.error('[NOTIFICATION_SETTINGS_ERROR]', error)
				onError?.(error)
				return null
			}
		},
		[user?.id]
	)

	const updateSettings = useCallback(
		async (
			data: UpdateNotificationSettingsInput,
			{ onSuccess, onError }: CallbackOptions = {}
		) => {
			if (!user?.id) return null

			try {
				const result = await updateNotificationSettings(user.id, data)
				if (result.success) {
					await fetchSettings()
					onSuccess?.()
					return true
				} else {
					throw new Error(result.error)
				}
			} catch (error) {
				console.error('[NOTIFICATION_SETTINGS_UPDATE_ERROR]', error)
				onError?.(error)
				return null
			}
		},
		[user?.id, fetchSettings]
	)

	return {
		settings,
		isLoading: isSessionLoading,
		fetchSettings,
		updateSettings
	}
}
