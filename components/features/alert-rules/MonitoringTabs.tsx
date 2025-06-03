'use client'

import { useTranslations } from "next-intl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Heading } from "@/components/ui/elements/Heading"
import { AlertRulesTable } from "./table/AlertRulesTable"
import { EventsTable } from "./table/EventsTable"

export function MonitoringTabs() {
    const t = useTranslations('dashboard.monitoring')
    
    return (
        <div className='lg:px-10'>
            <div className='block items-center justify-center justify-between space-y-3 lg:flex lg:space-y-0'>
                <Heading 
                    title={t('header.heading')}
                    description={t('header.description')}
                />
            </div>
            
            <Tabs defaultValue="rules" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="rules">{t('tabs.rules')}</TabsTrigger>
                    <TabsTrigger value="events">{t('tabs.events')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="rules" className="mt-6">
                    <AlertRulesTable />
                </TabsContent>
                
                <TabsContent value="events" className="mt-6">
                    <EventsTable />
                </TabsContent>
            </Tabs>
        </div>
    )
}