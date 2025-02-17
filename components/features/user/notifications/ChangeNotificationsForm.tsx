'use client'

import { ToggleCard, ToggleCardSkeleton } from "@/components/ui/elements/ToggleCard"
import { Form, FormField } from "@/components/ui/form"
import { useNotificationSettings } from "@/hooks/useNotificationSettings"
import { useTelegram } from "@/hooks/useTelegram"
import { type TypeChangeNotificationsSettingsSchema, changeNotificationsSchema } from "@/schemas/user/change-notifications.schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

export function ChangeNotificationsForm() {
    const t = useTranslations('dashboard.settings.notifications')
    
    const { checkAvailability } = useTelegram();
    const { settings, isLoading: loadingProfile, fetchSettings, updateSettings } = useNotificationSettings()

    useEffect(() => {
        fetchSettings({
            onError: (error) => {
                console.error(error)
            }
        })
    }, [fetchSettings])
    
    const form = useForm<TypeChangeNotificationsSettingsSchema>({
        resolver: zodResolver(changeNotificationsSchema),
        values: {
            siteNotifications: settings?.siteNotification ?? false,
            telegramNotifications: settings?.telegramNotification?? false,
        }

    })

    async function onChange(field: keyof TypeChangeNotificationsSettingsSchema, 
        value: boolean) {

            if (field !== 'telegramNotifications' || !value) {
                form.setValue(field, value)

                const fieldMapping = {
                    siteNotifications: 'siteNotification',
                    telegramNotifications:'telegramNotification',
                } as const

                updateSettings({
                    [fieldMapping[field]]: value,
                }, {
                    onSuccess: () => {
                        toast.success(t('succesMessage'))
                    },
                    onError: () => {
                        toast.error(t('errorMessage'))
                    }
                })
                return

            }

            // Check telegram settings before enable it
            const result = await checkAvailability({
                onError: (error) => {
                    toast.error(error instanceof Error ? error.message : t('errors.telegramCheck'))
                }
            })
            
            if (!result?.isAvailable) {
                form.setValue(field, false)
                toast.error(t('errors.telegramNotConfigured'))
                return
            }

            // if isAvailable 
            form.setValue(field, value)
            await updateSettings({
                telegramNotification: value
            }, {
                onSuccess: () => {
                    toast.success(t('succesMessage'))
                },
                onError: () => {
                    toast.error(t('errorMessage'))
                }
            })

            

            
            
    }
    return loadingProfile ? (
        Array.from({ length: 2 }).map((_, index) => (
            <ToggleCardSkeleton key={index} />
        ))
    ) : (
        <Form {...form}>
            <FormField 
                control={form.control}
                name='siteNotifications'
                render={({field}) =>(
                    <ToggleCard 
                        heading={t('siteNotifications.heading')}
                        description={t('siteNotifications.description')}
                        // isDisabled
                        value={field.value}
                        onChange={value => onChange('siteNotifications', value)}
                    />
                )}
            />

            <FormField 
                control={form.control}
                name='telegramNotifications'
                render={({field}) =>(
                    <ToggleCard 
                        heading={t('telegramNotifications.heading')}
                        description={t('telegramNotifications.description')}
                        // isDisabled
                        value={field.value}
                        onChange={value => onChange('telegramNotifications', value)}
                    />
                )}
            />

        </Form>
    )
}