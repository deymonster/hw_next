'use client'

import { Info, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

import { updateSystem } from '@/app/actions/update.actions'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'

interface VersionInfoModalProps {
	info: any
	licdVersion: any
}

export function VersionInfoModal({ info, licdVersion }: VersionInfoModalProps) {
	const t = useTranslations('dashboard.license')
	const [isOpen, setIsOpen] = useState(false)
	const [isUpdating, setIsUpdating] = useState(false)

	const handleUpdate = async () => {
		try {
			setIsUpdating(true)
			const res = await updateSystem()
			if (res.success) {
				toast.success(t('update.success'))
			} else {
				toast.error(res.error || t('update.error'))
			}
		} catch (error) {
			console.error('Update error:', error)
			toast.error(t('update.error'))
		} finally {
			setIsUpdating(false)
			setIsOpen(false)
		}
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
			<DialogContent className='sm:max-w-md'>
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
				</div>

				<div className='flex justify-end gap-3'>
					<Button variant='outline' onClick={() => setIsOpen(false)}>
						{t('version.close', { fallback: 'Закрыть' })}
					</Button>
					<Button onClick={handleUpdate} disabled={isUpdating}>
						<RefreshCw
							className={`mr-2 size-4 ${isUpdating ? 'animate-spin' : ''}`}
						/>
						{t('version.update', {
							fallback: 'Проверить и обновить'
						})}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
