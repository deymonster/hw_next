import { TelegramSettings } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'

import {
	checkTelegramAvailability,
	getTelegramSettings,
	saveTelegramSettings,
	sendTelegramMessage,
	startTelegramBot,
	verifyTelegramBotAction
} from '@/app/actions/telegramService'

interface CallbackOptions {
	onSuccess?: () => void
	onError?: (error: unknown) => void
}

export function useTelegram() {
	const { data: session, status } = useSession()
	const user = session?.user
	const isSessionLoading = status === 'loading'

	const [isVerifying, setIsVerifying] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [isStarting, setIsStarting] = useState(false)
	const [isSending, setIsSending] = useState(false)

	const [settings, setSettings] = useState<TelegramSettings | null>(null)

	const isConnected = Boolean(settings?.telegramChatId)
	const isActive = Boolean(settings?.isActive)

	const loadSettings = useCallback(async () => {
		if (!user?.id) return null
		try {
			const result = await getTelegramSettings(user.id)
			setSettings(result)
			return result
		} catch (error) {
			console.error('Error loading Telegram settings:', error)
			return null
		}
	}, [user?.id])

	useEffect(() => {
		let interval: NodeJS.Timeout | undefined

		if (user?.id) {
			loadSettings()

			if (settings?.botUsername && !settings?.isActive) {
				interval = setInterval(() => {
					loadSettings()
				}, 2000)
			}
		}

		return () => {
			if (interval) {
				clearInterval(interval)
			}
		}
	}, [user?.id, settings?.botUsername, settings?.isActive, loadSettings])

	const verifyBot = useCallback(
		async (token: string, options?: CallbackOptions) => {
			if (!user?.id) return null

			try {
				setIsVerifying(true)
				const result = await verifyTelegramBotAction(token)
				options?.onSuccess?.()
				return result
			} catch (error) {
				options?.onError?.(error)
				throw error
			} finally {
				setIsVerifying(false)
			}
		},
		[user?.id]
	)

	const saveSettings = useCallback(
		async (
			data: {
				botToken: string
				botUsername: string
				isActive?: boolean
				telegramChatId?: string | null
			},
			options?: CallbackOptions
		) => {
			if (!user?.id) return null

			try {
				setIsSaving(true)
				const result = await saveTelegramSettings(user.id, data)
				await loadSettings()
				options?.onSuccess?.()
				return result
			} catch (error) {
				options?.onError?.(error)
				throw error
			} finally {
				setIsSaving(false)
			}
		},
		[user?.id]
	)

	const startBot = useCallback(
		async (options?: CallbackOptions) => {
			if (!user?.id) return null

			try {
				setIsStarting(true)
				const result = await startTelegramBot(user.id)
				await loadSettings()
				options?.onSuccess?.()
				return result
			} catch (error) {
				options?.onError?.(error)
				throw error
			} finally {
				setIsStarting(false)
			}
		},
		[user?.id]
	)

	const sendTestMessage = useCallback(
		async (options?: CallbackOptions) => {
			if (!user?.id) return null

			try {
				setIsSending(true)
				const result = await sendTelegramMessage(
					user.id,
					'✅ Test message from NITRINOnet Monitoring System'
				)
				options?.onSuccess?.()
				return result
			} catch (error) {
				options?.onError?.(error)
				throw error
			} finally {
				setIsSending(false)
			}
		},
		[user?.id]
	)

	const sendMessage = useCallback(
		async (message: string, options?: CallbackOptions) => {
			if (!user?.id) return null

			try {
				setIsSending(true)
				const result = await sendTelegramMessage(user.id, message)
				options?.onSuccess?.()
				return result
			} catch (error) {
				options?.onError?.(error)
				throw error
			} finally {
				setIsSending(false)
			}
		},
		[user?.id]
	)

	const checkAvailability = useCallback(
		async (options?: CallbackOptions) => {
			if (!user?.id) return null

			try {
				const result = await checkTelegramAvailability(user.id)
				if (!result.isAvailable && result.error) {
					options?.onError?.(new Error(result.error))
				}
				return result
			} catch (error) {
				options?.onError?.(error)
				return null
			}
		},
		[user?.id]
	)

	return {
		verifyBot,
		saveSettings,
		startBot,
		sendTestMessage,
		sendMessage,
		checkAvailability,
		isVerifying,
		isSaving,
		isStarting,
		isSending,
		isSessionLoading,
		settings,
		isConnected,
		isActive
	}
}
