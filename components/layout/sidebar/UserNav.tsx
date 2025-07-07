import { Bell, Cpu, Home } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { Route } from './route.interface'
import { SidebarItem } from './SidebarItem'

export function UserNav() {
	const t = useTranslations('layout.sidebar.userNav')

	const routes: Route[] = [
		{
			label: t('home'),
			href: '/',
			icon: Home
		},
		{
			label: t('devices'),
			href: '/devices',
			icon: Cpu
		},
		{
			label: t('events'),
			href: '/events',
			icon: Bell
		}
	]
	return (
		<div className='space-y-2 px-2 pt-4 lg:pt-0'>
			{routes.map((route, index) => (
				<SidebarItem key={index} route={route} />
			))}
		</div>
	)
}
