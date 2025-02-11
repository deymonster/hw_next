import { useSession } from 'next-auth/react'
import { useCallback, useState } from 'react'

import {
    getSmtpSettings,
    updateSmtpSettings,
    createDefaultSmtpSettings,
} from '@/app/actions/smtpSettings'

import {SMTP_PROVIDER_DEFAULTS} from '@/services/smtp-settings/smtp-settiings.constants'

import type { SmtpSettings, SmtpProvider } from "@prisma/client"

interface CallbackOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useSmtpSettings() {
    const { data: session, status } = useSession()
    const user = session?.user
    const isSessionLoading = status === 'loading'

    const [settings, setSettings] = useState<SmtpSettings | null>(null)

    const fetchSettings = useCallback( async(
        { onSuccess, onError }: CallbackOptions = {}
    ) => {
        if (!user?.id) return null

        try {
            let result = await getSmtpSettings(user.id)

            if (!result) {
                result = await createDefaultSmtpSettings(user.id)
            }
            setSettings(result)
            onSuccess?.()
            return result
        } catch (error) {
            console.error('[FETCH_SETTINGS_ERROR]', error)
            onError?.(error)
            return null
        }
    }, [user?.id])

    const updateSettings = useCallback
    (async (
        data: Partial<Omit<SmtpSettings, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>,
        {onSuccess, onError}: CallbackOptions = {}
    ) => {
        if (!user?.id) return null

        try {
            const result = await updateSmtpSettings(user.id, data)
            if (result.success) {
                await fetchSettings()
                onSuccess?.()
                return true
            } else {
                throw new Error(result.error)
            }
        } catch (error) {
            console.error('[UPDATE_SETTINGS_ERROR]', error)
            onError?.(error)
            return null
        }
    }, [user?.id, fetchSettings])

    const updateProvider = useCallback(async (
        provider: SmtpProvider,
        { onSuccess, onError }: CallbackOptions = {}
    )=> {
        if (!user?.id) return null

        try {
            const result = await updateSmtpSettings(user.id, {
                provider,
                ...SMTP_PROVIDER_DEFAULTS[provider]
            })
            if (result.success) {
                await fetchSettings()
                onSuccess?.()
                return true
            } else {
                throw new Error(result.error)
            }
        } catch (error) {
            console.error('[SMTP_PROVIDER_UPDATE_ERROR]', error)
            onError?.(error)
            return null
        }
    }, [user?.id, fetchSettings])

    return {
        settings,
        isLoading: isSessionLoading,
        fetchSettings,
        updateSettings,
        updateProvider
    }

}

