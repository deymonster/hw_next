'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Fragment, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useEvents } from '@/hooks/useEvents'
import { EventWithDevice } from '@/services/event.interfaces'
import { getNotificationIcon } from '@/utils/get-notification-icon'

interface EventsListProps {
	onRead?: () => void
}

export function EventsList({ onRead }: EventsListProps) {
	const [events, setEvents] = useState<EventWithDevice[]>([])
	const { loading, error, fetchAndMarkAllAsRead, removeAllEvents } =
		useEvents()

	const t = useTranslations(
		'layout.header.headerMenu.profileMenu.notifications'
	)

	async function handleClearAll() {
		await removeAllEvents({
			onSuccess: () => {
				setEvents([])
				onRead?.()
			}
		})
	}

	useEffect(() => {
		async function fetchNotifications() {
			try {
				const result = await fetchAndMarkAllAsRead({
					onSuccess: () => onRead?.()
				})

				if (result.events) {
					setEvents(result.events)
				}
			} catch (error) {
				console.error('Failed to load notifications', error)
			}
		}

		fetchNotifications()
	}, [fetchAndMarkAllAsRead, onRead])

	return (
		<div className='flex flex-col'>
			<div className='flex items-center justify-between px-2'>
				<h2 className='text-lg font-medium'>{t('heading')}</h2>
				{events.length > 0 && (
					<Button
						variant='ghost'
						size='icon'
						onClick={handleClearAll}
						className='size-8'
						title='Clear all'
					>
						<Trash2 className='size-4' />
					</Button>
				)}
			</div>
			<Separator className='my-3' />

			{loading ? (
				<div className='flex items-center justify-center gap-x-2 text-sm text-foreground'>
					<Loader2 className='size-5 animate-spin' />
					{t('loading')}
				</div>
			) : error ? (
				<div className='p-4 text-center text-sm text-destructive'>
					{error}
				</div>
			) : events.length === 0 ? (
				<div className='p-4 text-center text-sm text-muted-foreground'>
					{t('empty')}
				</div>
			) : (
				<div className='flex flex-col gap-2 p-2'>
					{events.map((event, index) => {
						const Icon = getNotificationIcon(event.type)

						return (
							<Fragment key={index}>
								<div className='flex flex-col gap-1 text-sm'>
									<div className='flex items-center justify-between'>
										<span className='font-semibold'>
											{event.title}
										</span>
										<span className='text-xs text-muted-foreground'>
											{new Date(
												event.createdAt
											).toLocaleString('ru-RU')}
										</span>
									</div>
									<div className='flex items-start gap-x-3'>
										<div className='mt-1 rounded-full bg-foreground p-2'>
											<Icon className='size-4 text-secondary' />
										</div>
										<div className='flex-1'>
											<div className='whitespace-pre-wrap'>
												{event.message}
											</div>
										</div>
									</div>
								</div>
								{index < events.length - 1 && (
									<Separator className='my-3' />
								)}
							</Fragment>
						)
					})}
				</div>
			)}
		</div>
	)
}
