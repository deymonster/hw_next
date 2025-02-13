'use client'

import { Button } from "@/components/ui/button"
import { FormWrapper } from "@/components/ui/elements/FormWrapper"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useTelegram } from "@/hooks/useTelegram"
import { type TypeChangeTelegramSettingsSchema, changeTelegramSettingsSchema } from "@/schemas/user/change-telegram.schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"


export function ChangeTelegramSettingsForm() {
    const t = useTranslations('dashboard.settings.telegramSettings')

    const { 
        verifyBot, 
        saveSettings, 
        startBot, 
        sendTestMessage, 
        isVerifying, 
        isSaving,
        isConnected,
        isSending,
        settings
    } = useTelegram()


    const form = useForm<TypeChangeTelegramSettingsSchema>({
        resolver: zodResolver(changeTelegramSettingsSchema),
        defaultValues: {
            botToken: ''
        }
    })
    
    const handleVerify = async (values: TypeChangeTelegramSettingsSchema) => {
        try {
            
            const result = await verifyBot(values.botToken, {
                onError: () => toast.error(t('errors.verify'))
            })

            if (result?.isValid && result.username) {

                await saveSettings({
                    botToken: values.botToken,
                    botUsername: result.username,
                    isActive: false,
                    telegramChatId: null
                },{
                    onSuccess: () => {
                        toast.success(t('success.save')),
                        toast.info('Press start to activate Bot!')
                        window.open(`https://t.me/${result.username}`, '_blank')
                    },
                    onError: () => toast.error(t('errors.save'))
                })
                
                await startBot({
                    onSuccess: () => toast.success(t('success.start')),
                    onError: () => toast.error(t('errors.start'))
                })
                
            }
        } catch (error) {
            toast.error(t('errors.verify'))
        }
    }


    const handleTest = async () => {
        try {
            console.log('[TELEGRAM_FORM] Sending test message...');
            await sendTestMessage({
                onSuccess: () => toast.success(t('success.testMessage')),
                onError: () => toast.error(t('errors.testMessage'))
            })
            console.log('[TELEGRAM_FORM] Test message sent');
            
        } catch (error) {
            console.error('[TELEGRAM_FORM] Test message error:', error);
            
        }
    }

    const handleReconfigure = async () => {
        try {
            await saveSettings({
                botToken: '',
                botUsername: '',
                isActive: false,
                telegramChatId: null
            }, {
                onError: () => toast.error(t('errors.save'))
            })
            
            form.reset()
        } catch (error) {
            console.error('[TELEGRAM_FORM] Reset error:', error)
        }
    }

    return (
        <FormWrapper heading={t('header.heading')}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleVerify)} className="grid gap-y-3">
                    {!settings?.botUsername ? (
                        <>
                            <FormField
                                control={form.control}
                                name="botToken"
                                render={({ field }) => (
                                    <FormItem className="px-5">
                                        <FormLabel>{t('botToken.heading')}</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled={isVerifying || isSaving} />
                                        </FormControl>
                                        <FormDescription>
                                            {t('botToken.description')}
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                            <Separator />
                            <div className="flex justify-end p-5">
                                <Button 
                                    type="submit"
                                    disabled={!form.formState.isValid || isVerifying || isSaving}
                                >
                                    {(isVerifying || isSaving) ? (
                                        <Loader2 className="animate-spin h-4 w-4 mr-2"/>
                                    ) : (
                                        t('verify')
                                    )}
                                </Button>
                            </div>
                        </>
                    ) : !settings.isActive ? (
                        <div className="px-5 pb-5 space-y-4">
                            <FormDescription>
                                {t('connectDescription')}
                            </FormDescription>
                            <div className="flex justify-end gap-2">
                                <Button 
                                    variant="outline"
                                    onClick={handleReconfigure}
                                >
                                    {t('reconfigure')}
                                </Button>
                                <Button 
                                    variant="secondary"
                                    onClick={() => window.open(`https://t.me/${settings.botUsername}`, '_blank')}
                                >
                                    {t('openChat')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="px-5 pb-5 space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 text-green-600">
                                    <div className="flex items-center gap-2">
                                        <span>✅</span>
                                        <span>Подключен бот:</span>
                                        <a 
                                            href={`https://t.me/${settings.botUsername}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium hover:underline"
                                        >
                                            @{settings.botUsername}
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button 
                                    variant="outline"
                                    onClick={handleReconfigure}
                                >
                                    {t('reconfigure')}
                                </Button>
                                <Button 
                                    onClick={handleTest}
                                    disabled={isSending}
                                >
                                    {isSending ? (
                                        <Loader2 className="animate-spin h-4 w-4 mr-2"/>
                                    ) : (
                                        t('sendTest')
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            </Form>
        </FormWrapper>
    )
    
}
     
    