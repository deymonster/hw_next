'use client'

import { LayoutDashboard, Loader2, LogOut, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
	const router = useRouter()

	const { exit } = useAuth()
	const { user, loading } = useUser()

	const handleLogout = async () => {
		try {
			await exit()
			toast.success(t('successMessage'))
			setTimeout(() => {
				router.push('/account/login')
			}, 2000)
		} catch (error) {
			console.error('Logout error:', error)
			toast.error(t('errorMessage'))
		}
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
					<Link href={`/${user.name}`}>
						<DropdownMenuItem>
							<User className='mr-2 size-4' />
							{t('profile')}
						</DropdownMenuItem>
					</Link>

					<Link href='/dashboard/settings'>
						<DropdownMenuItem>
							<LayoutDashboard className='mr-2 size-4' />
							{t('dashboard')}
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
