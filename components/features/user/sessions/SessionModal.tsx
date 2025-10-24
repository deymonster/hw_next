import { useTranslations } from 'next-intl'
import { PropsWithChildren, useMemo } from 'react'

import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import type { UserSession } from '@/services/redis/types'
import { useFormatDate } from '@/utils/format-date'

interface SessionModalProps {
	session: UserSession | null | undefined
}

/**
 * Returns a human friendly representation of the provided IP address.
 *
 * Localhost and empty addresses are mapped to descriptive placeholders to make
 * the modal content easier to understand for end-users.
 */
function formatIP(ip?: string) {
	if (!ip) return 'Unknown'
	if (ip === '::1' || ip === '127.0.0.1') return 'localhost'
	return ip
}

/**
 * Displays detailed information about a user session inside a modal window.
 *
 * The component leverages localized strings and the {@link useFormatDate}
 * hook to render human readable metadata about the selected session.
 */
export function SessionModal({
	children,
	session
}: PropsWithChildren<SessionModalProps>) {
	const t = useTranslations('dashboard.settings.sessions.sessionModal')
	const formatDate = useFormatDate()
	const createdAt = useMemo(
		() => formatDate(session?.createdAt ?? 0, true),
		[formatDate, session?.createdAt]
	)
	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>

			<DialogContent>
				<DialogTitle className='text-xl'>{t('heading')}</DialogTitle>
				<div className='space-y-3'>
					<div className='flex items-center'>
						<span className='font-medium'>{t('device')}</span>
						<span className='ml-2 text-muted-foreground'>
							{session?.metadata?.device?.browser},{' '}
							{session?.metadata?.device?.os}
						</span>
					</div>

					<div className='flex items-center'>
						<span className='font-medium'>{t('osVersion')}</span>
						<span className='ml-2 text-muted-foreground'>
							{session?.metadata?.device?.osVersion}
						</span>
					</div>

					<div className='flex items-center'>
						<span className='font-medium'>{t('createdAt')}</span>
						<span className='ml-2 text-muted-foreground'>
							{createdAt}
						</span>
					</div>

					<div className='flex items-center'>
						<span className='font-medium'>{t('ipAddress')}</span>
						<span className='ml-2 text-muted-foreground'>
							{formatIP(session?.metadata?.network?.ip)}
						</span>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
