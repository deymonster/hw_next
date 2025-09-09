import { RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface ProcessHeaderProps {
	isConnected: boolean
	isLoading: boolean
	lastUpdated: number | null
	totalProcesses: number
	showAllProcesses: boolean
	setShowAllProcesses: (value: boolean) => void
	reconnect: () => void
}

export function ProcessHeader({
	isConnected,
	isLoading,
	lastUpdated,
	totalProcesses,
	showAllProcesses,
	setShowAllProcesses,
	reconnect
}: ProcessHeaderProps) {
	const t = useTranslations('dashboard.devices.detail.processes')

	return (
		<CardHeader className='bg-muted/50 pb-3'>
			<div className='flex items-center justify-between'>
				<CardTitle className='text-lg'>
					{t('runningProcesses')}
				</CardTitle>
				<div className='flex items-center gap-2'>
					{isConnected ? (
						<Badge
							variant='outline'
							className='border-green-500/20 bg-green-500/10 px-2 py-0 text-xs text-green-500'
						>
							{t('live')}
						</Badge>
					) : (
						<Badge
							variant='outline'
							className='border-red-500/20 bg-red-500/10 px-2 py-0 text-xs text-red-500'
						>
							{t('disconnected')}
						</Badge>
					)}
					{lastUpdated && (
						<span className='text-xs text-muted-foreground'>
							{t('updated')}:{' '}
							{new Date(lastUpdated).toLocaleTimeString()}
						</span>
					)}
					<Button
						variant='ghost'
						size='icon'
						className='h-7 w-7'
						onClick={reconnect}
						disabled={isLoading}
					>
						<RefreshCw
							className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
						/>
					</Button>
				</div>
			</div>

			<div className='mt-2 flex items-center justify-between'>
				<p className='text-sm text-muted-foreground'>
					{t('totalProcesses')}: {totalProcesses}
				</p>

				<div className='flex items-center space-x-2'>
					<Switch
						id='show-all-processes'
						checked={showAllProcesses}
						onCheckedChange={setShowAllProcesses}
					/>
					<Label htmlFor='show-all-processes' className='text-xs'>
						{t('showAllProcesses')}
					</Label>
				</div>
			</div>
		</CardHeader>
	)
}
