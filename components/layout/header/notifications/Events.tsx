'use client'

import { Bell } from 'lucide-react'
import { useState } from 'react'

import { EventsList } from './EventsList'

import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import { useEvents } from '@/hooks/useEvents'

export function Events() {
	const { unreadCount, loading } = useEvents()
	const [isOpen, setIsOpen] = useState(false)

	const displayCount = unreadCount > 9 ? '9+' : unreadCount

	if (loading) return null

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger>
				<div className='relative'>
					<Bell className='size-5 text-foreground' />
					{unreadCount > 0 && (
						<div className='absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary px-[5px] text-xs font-semibold text-white'>
							{displayCount}
						</div>
					)}
				</div>
			</PopoverTrigger>
			<PopoverContent
				align='end'
				className='max-h-[500px] w-[320px] overflow-y-auto'
			>
				<EventsList onRead={() => {}} />
			</PopoverContent>
		</Popover>
	)
}
