'use client'

import { Event } from '@prisma/client'
import { CheckCheck, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { EventDetail } from '../detail/EventDetail'
import { createEventsColumns } from './EventsColumns'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/elements/DataTable'
import { useEvents } from '@/hooks/useEvents'

export function EventsTable() {
	const t = useTranslations('dashboard.monitoring.events')
	const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
	const [events, setEvents] = useState<Event[]>([])

	const currentPage = 1
	const pageSize = 10

	const {
		loading,
		error,
		fetchAllEvents,
		fetchAndMarkAllAsRead,
		markAsRead
	} = useEvents()
	const selectedEvent = useMemo(() => {
		if (!selectedEventId || !events) return null
		return events.find(event => event.id === selectedEventId) || null
	}, [selectedEventId, events])

	const loadEvents = useCallback(async () => {
		const result = await fetchAllEvents({
			take: pageSize,
			skip: (currentPage - 1) * pageSize,
			orderBy: 'createdAt',
			orderDir: 'desc'
		})

		if (result.events) {
			setEvents(result.events)
		}
	}, [fetchAllEvents, currentPage, pageSize])

	const handleMarkAsRead = useCallback(
		async (eventId: string) => {
			const result = await markAsRead(eventId, {})
			if (!result.error) {
				// Обновляем список событий после отметки как прочитанного
				loadEvents()
			}
		},
		[markAsRead, loadEvents]
	)

	const columns = useMemo(
		() => createEventsColumns((key: string) => t(key), handleMarkAsRead),
		[t, handleMarkAsRead]
	)

	useEffect(() => {
		loadEvents()
	}, [loadEvents])

	if (loading) {
		return (
			<div className='flex items-center justify-center p-4 text-sm'>
				<Loader2 className='mr-2 h-4 w-4 animate-spin' />
				{t('loading')}
			</div>
		)
	}

	if (error) {
		return <div className='p-4 text-center text-destructive'>{error}</div>
	}

	const handleRowClick = (event: Event) => {
		setSelectedEventId(event.id)
	}

	const handleMarkAllAsRead = async () => {
		const result = await fetchAndMarkAllAsRead({})
		if (!result.error) {
			// Обновляем список событий после отметки всех как прочитанных
			loadEvents()
		}
	}

	return (
		<>
			{selectedEvent ? (
				<EventDetail
					event={selectedEvent}
					onBack={() => setSelectedEventId(null)}
				/>
			) : (
				<div>
					<div className='mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center'>
						<div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row'>
							<Button
								variant='outline'
								onClick={handleMarkAllAsRead}
								className='h-8 w-full text-xs sm:w-auto'
							>
								<CheckCheck className='mr-1 h-3 w-3' />
								<span className='hidden sm:inline'>
									{t('markAllAsRead')}
								</span>
								<span className='sm:hidden'>
									Отметить все как прочитанные
								</span>
							</Button>
						</div>
					</div>

					<div className='overflow-x-auto'>
						<DataTable
							columns={columns}
							data={events || []}
							onRowClick={handleRowClick}
							filtering={{
								enabled: true,
								column: 'title',
								placeholder: t('searchPlaceholder')
							}}
							pagination={{
								enabled: true,
								pageSize: 10,
								showPageSize: true,
								showPageNumber: true
							}}
						/>
					</div>
				</div>
			)}
		</>
	)
}
