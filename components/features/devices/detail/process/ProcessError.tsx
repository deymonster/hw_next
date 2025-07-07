import { AlertCircle } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'

interface ProcessErrorProps {
	error: string
	reconnect: () => void
}

export function ProcessError({ error, reconnect }: ProcessErrorProps) {
	return (
		<div className='flex items-center justify-between bg-red-500/10 p-4 text-red-500'>
			<div className='flex items-center'>
				<AlertCircle className='mr-2 h-4 w-4' />
				<span>Error: {error}</span>
			</div>
			<Button
				variant='outline'
				size='default'
				onClick={reconnect}
				className='border-red-500/20 text-xs hover:bg-red-500/10'
			>
				Retry
			</Button>
		</div>
	)
}
