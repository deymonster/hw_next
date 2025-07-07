'use client'

import { ArrowLeftFromLine, ArrowRightFromLine } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Hint } from '@/components/ui/elements/Hint'
import { useSidebar } from '@/hooks/useSidebar'

export function SidebarHeader() {
	const t = useTranslations('layout.sidebar.header')
	const { isCollapsed, open, close } = useSidebar()

	const label = isCollapsed ? t('expand') : t('collapse')

	return isCollapsed ? (
		<div className='mb-4 hidden w-full items-center justify-center pt-4 lg:flex'>
			<Hint label={label} side='right' asChild>
				<Button onClick={() => open()} variant='ghost' size='icon'>
					<ArrowRightFromLine className='size-4' />
				</Button>
			</Hint>
		</div>
	) : (
		<div className='mb-2 flex w-full items-center justify-between p-3 pl-4'>
			<h2 className='text-lg font-semibold text-foreground'>
				{t('navigation')}
			</h2>
			<Hint label={label} side='right' asChild>
				<Button onClick={() => close()} variant='ghost' size='icon'>
					<ArrowLeftFromLine className='size-4' />
				</Button>
			</Hint>
		</div>
	)
}
