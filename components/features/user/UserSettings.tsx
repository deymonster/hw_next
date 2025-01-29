'use client'

import { Heading } from "@/components/ui/elements/Heading"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslations } from "use-intl"

export function UserSettings() {
    const t = useTranslations('dashboard.settings')
    return (
        <div className='lg:px-10'>
            <Heading 
                title={t('header.heading')} 
                description={t('header.description')}
                size='lg'
            />
            <Tabs defaultValue='profile' className='mt-3 w-full'>
                <TabsList className='grid max-w-2xl grid-cols-5'>
                    <TabsTrigger value='profile'>{t('header.profile')}</TabsTrigger>
                    <TabsTrigger value='account'>{t('header.account')}</TabsTrigger>
                    <TabsTrigger value='appearance'>{t('header.appearance')}</TabsTrigger>
                    <TabsTrigger value='notifications'>{t('header.notifications')}</TabsTrigger>
                    <TabsTrigger value='sessions'>{t('header.sessions')}</TabsTrigger>
                </TabsList>
                <TabsContent value='profile'>Профиль</TabsContent>
                <TabsContent value='account'>Аккаунт</TabsContent>
                <TabsContent value='appearance'>Внешний вид</TabsContent>
                <TabsContent value='notifications'>Уведомления</TabsContent>
                <TabsContent value='sessions'>Сессии</TabsContent>
            </Tabs>
        </div>
    )
}