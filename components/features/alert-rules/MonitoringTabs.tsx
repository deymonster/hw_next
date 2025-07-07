'use client'

import { useTranslations } from 'next-intl'

import { AlertRulesTable } from './table/AlertRulesTable'
import { EventsTable } from './table/EventsTable'

import { Heading } from '@/components/ui/elements/Heading'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function MonitoringTabs() {
	const t = useTranslations('dashboard.monitoring')

	return (
		<div className='px-2 sm:px-4 lg:px-10'>
			<div className='block items-center justify-center justify-between space-y-3 lg:flex lg:space-y-0'>
				<Heading
					title={t('header.heading')}
					description={t('header.description')}
					className='text-center lg:text-left'
				/>
			</div>

			<Tabs defaultValue='rules' className='mt-4 sm:mt-6'>
				<TabsList className='grid h-9 w-full grid-cols-2 sm:h-10'>
					<TabsTrigger value='rules' className='text-xs sm:text-sm'>
						{t('tabs.rules')}
					</TabsTrigger>
					<TabsTrigger value='events' className='text-xs sm:text-sm'>
						{t('tabs.events')}
					</TabsTrigger>
				</TabsList>

				<TabsContent value='rules' className='mt-4 sm:mt-6'>
					<AlertRulesTable />
				</TabsContent>

				<TabsContent value='events' className='mt-4 sm:mt-6'>
					<EventsTable />
				</TabsContent>
			</Tabs>
		</div>
	)
}
