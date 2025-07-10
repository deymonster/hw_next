'use client'

import { usePathname } from 'next/navigation'
import type { PropsWithChildren } from 'react'

import { Header } from '@/components/layout/header/Header'
import { LayoutContainer } from '@/components/layout/LayoutContainer'
import { Sidebar } from '@/components/layout/sidebar/Sidebar'

export default function SiteLayout({ children }: PropsWithChildren<unknown>) {
	const pathname = usePathname()

	// Если это главная страница, показываем только содержимое без меню и заголовка
	if (pathname === '/') {
		return (
			<div className='flex h-full flex-col'>
				<div className='flex-1'>{children}</div>
			</div>
		)
	}

	// Для всех остальных страниц в группе (site) показываем полный макет с меню и заголовком
	return (
		<div className='flex h-full flex-col'>
			<div className='flex-1'>
				<div className='fixed inset-y-0 z-50 h-[75px] w-full'>
					<Header />
				</div>
				<Sidebar />
				<LayoutContainer>{children}</LayoutContainer>
			</div>
		</div>
	)
}
