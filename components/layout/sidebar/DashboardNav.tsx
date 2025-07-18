import { Bell, Building, Cpu, Package, Settings, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { Route } from './route.interface'
import { SidebarItem } from './SidebarItem'

export function DashboardNav() {
	const t = useTranslations('layout.sidebar.dashboardNav')

	const routes: Route[] = [
		{
			label: t('settings'),
			href: '/dashboard/settings',
			icon: Settings
		},
		{
			label: t('devices'),
			href: '/dashboard/devices',
			icon: Cpu
		},
		{
			label: t('events'),
			href: '/dashboard/alert-rules',
			icon: Bell
		},
		{
			label: t('inventory'),
			href: '/dashboard/inventory',
			icon: Package
		},
		{
			label: t('departments'),
			href: '/dashboard/departments',
			icon: Building
		},
		{
			label: t('users'),
			href: '/dashboard/employees',
			icon: Users
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
