'use client'

import { Bell, Cpu, LayoutDashboard, Loader2, LogOut } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import { Events } from './notifications/Events'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdowmmenu'
import { UserAvatar } from '@/components/ui/elements/UserAvatar'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'

export function ProfileMenu() {
	const t = useTranslations('layout.header.headerMenu.profileMenu')
	const { exit } = useAuth()
	const { user, loading } = useUser()
	const [isLoggingOut, setIsLoggingOut] = useState(false)

	const handleLogout = async () => {
		try {
			setIsLoggingOut(true)
			await exit()
			toast.success(t('successMessage'))
		} catch (error) {
			console.error('Logout error:', error)
			toast.error(t('errorMessage'))
			setIsLoggingOut(false)
		}
	}

	// Если происходит выход, показываем спиннер на весь экран
	if (isLoggingOut) {
		return (
			<div className='fixed inset-0 z-50 flex h-screen items-center justify-center bg-background/80 backdrop-blur-sm'>
				<div className='h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary'></div>
			</div>
		)
	}

	return loading || !user ? (
		<Loader2 className='size-6 animate-spin text-muted-foreground' />
	) : (
		<>
			<Events />
			<DropdownMenu>
				<DropdownMenuTrigger>
					<UserAvatar
						profile={{
							name: user?.name || '',
							image: user?.image || null
						}}
					/>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end' className='w-[230px]'>
					<div className='flex items-center gap-x-2 p-2'>
						<UserAvatar profile={user} />
						<h2 className='font-medium text-foreground'>
							{user.name}
						</h2>
					</div>
					<DropdownMenuSeparator />

					<Link href='/dashboard/settings'>
						<DropdownMenuItem>
							<LayoutDashboard className='mr-2 size-4' />
							{t('settings')}
						</DropdownMenuItem>
					</Link>

					<Link href='/dashboard/devices'>
						<DropdownMenuItem>
							<Cpu className='mr-2 size-4' />
							{t('devices')}
						</DropdownMenuItem>
					</Link>

					<Link href='/dashboard/alert-rules'>
						<DropdownMenuItem>
							<Bell className='mr-2 size-4' />
							{t('alerts')}
						</DropdownMenuItem>
					</Link>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						className='text-red-500 focus:text-red-500'
						onClick={handleLogout}
					>
						<LogOut className='mr-2 size-4' />
						{t('logout')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	)
}
