'use client'

import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/elements/UserAvatar'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
	const { user, loading, exit } = useAuth()

	if (loading) {
		return <div>Loading...</div>
	}

	return (
		<div className='p-4'>
			<div className='mb-4 flex gap-2'>
				<Button variant='outline'>Outline</Button>
				<Button variant='secondary'>Secondary</Button>
				<Button variant='ghost'>Ghost</Button>
				<Button variant='secondary' onClick={exit}>
					Выйти
				</Button>
			</div>

			{user && (
				<div className='rounded-lg border p-4'>
					<h2 className='mb-2 text-xl font-bold'>
						Информация о пользователе:
					</h2>

					<p>Email: {user.email}</p>
					<p>Имя: {user.name || 'Не указано'}</p>
					<p>Роль: {user.role}</p>
					<div>
						{JSON.stringify(user)}
						<UserAvatar
							profile={{
								name: user.name,
								image: user.image
							}}
						/>
					</div>
				</div>
			)}
		</div>
	)
}
