'use client'

import { Event } from '@prisma/client'
import {
	ArrowLeft,
	Bell,
	Calendar,
	CheckCheck,
	Info,
	MessageSquare,
	Monitor,
	// Добавляем новую иконку
	Shield,
	Tag
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEvents } from '@/hooks/useEvents'

interface EventDetailProps {
	event: Event & {
		device?: {
			id: string
			name: string
			ipAddress: string
		} | null
	}
	onBack: () => void
}

export function EventDetail({ event, onBack }: EventDetailProps) {
	const t = useTranslations('dashboard.monitoring.events')
	const { markAsRead } = useEvents()
	const [isMarking, setIsMarking] = useState(false)

	const handleMarkAsRead = async () => {
		try {
			setIsMarking(true)
			await markAsRead(event.id, {})
			toast.success(t('markAsReadSuccess'))
		} catch (error) {
			console.error(error)
			toast.error(t('markAsReadError'))
		} finally {
			setIsMarking(false)
		}
	}

	// Функция для определения цвета бейджа в зависимости от приоритета
	const getSeverityColor = (severity: string): string => {
		switch (severity) {
			case 'LOW':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
			case 'MEDIUM':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
			case 'HIGH':
				return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
			case 'CRITICAL':
				return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
			default:
				return ''
		}
	}

	return (
		<div className='mt-6 space-y-6'>
			<div className='flex items-center justify-between'>
				<div className='flex items-center space-x-2'>
					<Button variant='ghost' onClick={onBack}>
						<ArrowLeft className='mr-2 h-4 w-4' />
						{t('backToList')}
					</Button>
				</div>

				<div className='flex items-center space-x-2'>
					{!event.isRead && (
						<Button
							variant='outline'
							size='default'
							onClick={handleMarkAsRead}
							disabled={isMarking}
						>
							<CheckCheck className='mr-2 h-4 w-4' />
							{t('actions.markAsRead')}
						</Button>
					)}
				</div>
			</div>

			<div>
				<h2 className='text-2xl font-bold'>{event.title}</h2>
				<div className='mt-2 flex flex-wrap gap-2'>
					<Badge className={`${getSeverityColor(event.severity)}`}>
						{t(`severities.${event.severity.toLowerCase()}`)}
					</Badge>
					<Badge variant='outline'>
						{t(`eventTypes.${event.type.toLowerCase()}`)}
					</Badge>
					<Badge variant={event.isRead ? 'secondary' : 'default'}>
						{event.isRead ? t('status.read') : t('status.unread')}
					</Badge>
				</div>
			</div>

			<Tabs defaultValue='details'>
				<TabsList className='grid w-full grid-cols-1'>
					<TabsTrigger value='details'>
						{t('detail.info')}
					</TabsTrigger>
				</TabsList>

				<TabsContent value='details'>
					<Card>
						<CardContent className='pt-6'>
							<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<MessageSquare className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('message')}
										</h3>
									</div>
									<p className='whitespace-pre-wrap pl-6 text-sm text-muted-foreground'>
										{event.message}
									</p>
								</div>

								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<Tag className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('type')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{t(
											`eventTypes.${event.type.toLowerCase()}`
										)}
									</p>
								</div>

								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<Shield className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('severity')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{t(
											`severities.${event.severity.toLowerCase()}`
										)}
									</p>
								</div>

								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<Bell className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('status.title')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{event.isRead
											? t('status.read')
											: t('status.unread')}
									</p>
								</div>

								{/* Новая секция для информации об устройстве */}
								{event.device && (
									<div className='rounded-lg bg-secondary/20 p-4'>
										<div className='mb-2 flex items-center space-x-2'>
											<Monitor className='h-4 w-4 text-muted-foreground' />
											<h3 className='font-medium'>
												{t('detail.device')}
											</h3>
										</div>
										<div className='pl-6 text-sm text-muted-foreground'>
											<p className='font-medium'>
												{event.device.name}
											</p>
											<p className='text-xs'>
												IP: {event.device.ipAddress}
											</p>
										</div>
									</div>
								)}

								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<Calendar className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('createdAt')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{new Date(
											event.createdAt
										).toLocaleString()}
									</p>
								</div>

								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<Info className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('detail.id')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{event.id}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	)
}
