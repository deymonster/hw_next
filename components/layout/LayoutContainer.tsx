'use client'

import { type PropsWithChildren, useEffect, useRef } from 'react'

import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSidebar } from '@/hooks/useSidebar'
import { cn } from '@/utils/tw-merge'

export function LayoutContainer({ children }: PropsWithChildren<unknown>) {
	const isMobile = useMediaQuery('(max-width: 1024px)')
	const { isCollapsed, open, close } = useSidebar()
	// Track if the initial state has been set
	const initialStateSet = useRef(false)

	useEffect(() => {
		// Only set the initial state based on screen size
		// Don't override user's manual actions after initial load
		if (!initialStateSet.current) {
			if (isMobile) {
				close()
			} else {
				open()
			}
			initialStateSet.current = true
		}
	}, [isMobile, open, close])

	return (
		<main
			className={cn(
				'mt-[75px] flex-1 p-8',
				isCollapsed ? 'ml-16' : 'ml-16 lg:ml-64'
			)}
		>
			{children}
		</main>
	)
}
