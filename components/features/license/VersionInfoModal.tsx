'use client'

import { Info, RefreshCw, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface VersionInfoModalProps {
	info: {
		version?: string | null
		dockerHub?: {
			tag?: string | null
			updated?: string | null
		} | null
	} | null
	licdVersion: {
		version?: string | null
		date?: string | null
	} | null
}

export function VersionInfoModal({ info, licdVersion }: VersionInfoModalProps) {
	const t = useTranslations('dashboard.license')
	const [isOpen, setIsOpen] = useState(false)
	const [isUpdating, setIsUpdating] = useState(false)
	const [logs, setLogs] = useState<string[]>([])
	const eventSourceRef = useRef<EventSource | null>(null)
	const logsEndRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (logsEndRef.current) {
			logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
		}
	}, [logs])

	// Clean up event source on unmount
	useEffect(() => {
		return () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close()
			}
		}
	}, [])

	const handleUpdate = async () => {
		if (isUpdating) return

		setIsUpdating(true)
		setLogs([])

		try {
			// Connect to SSE stream
			const es = new EventSource('/api/update/stream')
			eventSourceRef.current = es

			es.onmessage = event => {
				if (event.data === 'closed') {
					es.close()
					setIsUpdating(false)
					toast.success(t('update.success'))
					return
				}
				setLogs(prev => [...prev, event.data])
			}

			es.onerror = error => {
				console.error('SSE error:', error)
				es.close()
				setIsUpdating(false)
				toast.error(t('update.error'))
			}

			es.addEventListener('error', (e: MessageEvent) => {
				if (e.data) {
					setLogs(prev => [...prev, `Error: ${e.data}`])
				}
			})
		} catch (error) {
			console.error('Update initiation error:', error)
			setIsUpdating(false)
			toast.error(t('update.error'))
		}
	}

	const handleClose = () => {
		if (isUpdating && eventSourceRef.current) {
			eventSourceRef.current.close()
		}
		setIsOpen(false)
		setIsUpdating(false)
		setLogs([])
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					variant='ghost'
					size='icon'
					className='text-muted-foreground hover:text-foreground'
				>
					<Info className='size-5' />
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-md md:max-w-lg'>
				<DialogHeader>
					<DialogTitle>
						{t('version.title', {
							fallback: 'Системная информация'
						})}
					</DialogTitle>
					<DialogDescription>
						{t('version.description', {
							fallback: 'Версии компонентов системы'
						})}
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-4 py-4'>
					<div className='flex items-center justify-between rounded-lg border p-3'>
						<div className='space-y-1'>
							<p className='text-sm font-medium'>Next.js App</p>
							{info?.dockerHub?.updated && (
								<p className='text-xs text-muted-foreground'>
									Обновлено:{' '}
									{new Date(
										info.dockerHub.updated
									).toLocaleDateString('ru-RU')}
								</p>
							)}
						</div>
						<span className='font-mono text-sm'>
							{info?.dockerHub?.tag ??
								`v${info?.version || 'unknown'}`}
						</span>
					</div>

					<div className='flex items-center justify-between rounded-lg border p-3'>
						<div className='space-y-1'>
							<p className='text-sm font-medium'>
								License Daemon (licd)
							</p>
							{licdVersion?.date && (
								<p className='text-xs text-muted-foreground'>
									Сборка:{' '}
									{new Date(
										licdVersion.date
									).toLocaleDateString('ru-RU')}
								</p>
							)}
						</div>
						<span className='font-mono text-sm'>
							{licdVersion?.version ?? 'unknown'}
						</span>
					</div>

					{/* Logs Area */}
					{(isUpdating || logs.length > 0) && (
						<div className='mt-4 rounded-lg border bg-muted/50 p-2'>
							<p className='mb-2 text-xs font-medium text-muted-foreground'>
								Журнал обновления:
							</p>
							<ScrollArea className='h-[200px] w-full rounded border bg-background p-2 font-mono text-xs'>
								{logs.map((log, i) => (
									<div
										key={i}
										className='whitespace-pre-wrap break-all'
									>
										{log}
									</div>
								))}
								<div ref={logsEndRef} />
							</ScrollArea>
						</div>
					)}
				</div>

				<div className='flex justify-end gap-3'>
					<Button
						variant='outline'
						onClick={handleClose}
						disabled={isUpdating}
					>
						{t('version.close', { fallback: 'Закрыть' })}
					</Button>
					<Button onClick={handleUpdate} disabled={isUpdating}>
						{isUpdating ? (
							<RefreshCw className='mr-2 size-4 animate-spin' />
						) : (
							<RefreshCw className='mr-2 size-4' />
						)}
						{isUpdating
							? t('version.updating', {
									fallback: 'Обновление...'
								})
							: t('version.update', {
									fallback: 'Проверить и обновить'
								})}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
