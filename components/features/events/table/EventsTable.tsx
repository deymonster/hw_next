'use client'

import { Event } from '@prisma/client'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { useEvents } from '@/hooks/useEvents'
import { getNotificationIcon } from '@/utils/get-notification-icon'

interface EventsTableProps {
	take?: number
	_skip?: number
}

export function EventsTable({ take = 10, _skip = 0 }: EventsTableProps) {
	const [events, setEvents] = useState<Event[]>([])
	const [total, setTotal] = useState<number>(0)
	const [currentPage, setCurrentPage] = useState<number>(1)
	const [pageSize] = useState<number>(take)

	const { loading, error, fetchAllEvents } = useEvents()
	const t = useTranslations('events')

	const totalPages = Math.ceil(total / pageSize)

	useEffect(() => {
		async function loadEvents() {
			const result = await fetchAllEvents({
				take: pageSize,
				skip: (currentPage - 1) * pageSize,
				orderBy: 'createdAt',
				orderDir: 'desc'
			})

			if (result.events) {
				setEvents(result.events)
				setTotal(result.total)
			}
		}

		loadEvents()
	}, [fetchAllEvents, currentPage, pageSize])

	const handleNextPage = () => {
		if (currentPage < totalPages) {
			setCurrentPage(currentPage + 1)
		}
	}

	const handlePrevPage = () => {
		if (currentPage > 1) {
			setCurrentPage(currentPage - 1)
		}
	}

	return (
		<div className='space-y-4'>
			<h2 className='text-2xl font-bold'>{t('title')}</h2>

			{loading ? (
				<div className='flex items-center justify-center py-8'>
					<Loader2 className='size-8 animate-spin' />
				</div>
			) : error ? (
				<div className='p-4 text-center text-destructive'>{error}</div>
			) : (
				<>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className='w-[50px]'></TableHead>
								<TableHead>{t('message')}</TableHead>
								<TableHead>{t('type')}</TableHead>
								<TableHead>{t('date')}</TableHead>
								<TableHead>{t('status')}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{events.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className='py-8 text-center'
									>
										{t('noEvents')}
									</TableCell>
								</TableRow>
							) : (
								events.map(event => {
									const Icon = getNotificationIcon(event.type)
									return (
										<TableRow key={event.id}>
											<TableCell>
												<div className='rounded-full bg-foreground p-2'>
													<Icon className='size-5 text-secondary' />
												</div>
											</TableCell>
											<TableCell>
												{event.message}
											</TableCell>
											<TableCell>{event.type}</TableCell>
											<TableCell>
												{new Date(
													event.createdAt
												).toLocaleString()}
											</TableCell>
											<TableCell>
												{event.isRead ? (
													<span className='text-muted-foreground'>
														{t('read')}
													</span>
												) : (
													<span className='font-medium text-primary'>
														{t('unread')}
													</span>
												)}
											</TableCell>
										</TableRow>
									)
								})
							)}
						</TableBody>
					</Table>

					{totalPages > 1 && (
						<div className='flex items-center justify-between py-4'>
							<div className='text-sm text-muted-foreground'>
								{t('showing')}{' '}
								{(currentPage - 1) * pageSize + 1}-
								{Math.min(currentPage * pageSize, total)}{' '}
								{t('of')} {total}
							</div>
							<div className='flex gap-x-2'>
								<Button
									variant='outline'
									size='default'
									onClick={handlePrevPage}
									disabled={currentPage === 1}
								>
									{t('previous')}
								</Button>
								<Button
									variant='outline'
									size='default'
									onClick={handleNextPage}
									disabled={currentPage === totalPages}
								>
									{t('next')}
								</Button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	)
}
