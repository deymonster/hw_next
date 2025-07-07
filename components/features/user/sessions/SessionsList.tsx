'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { SessionItem } from './SessionItem'

import { Heading } from '@/components/ui/elements/Heading'
import { ToggleCardSkeleton } from '@/components/ui/elements/SmtpSettingsFormSkeleton'
import { useSessionManager } from '@/hooks/useSessionManager'

export function SessionsList() {
	const t = useTranslations('dashboard.settings.sessions')

	const {
		sessions: dataSessions,
		loading: isLoadingSessions,
		getCurrentSession,
		fetchSessions
	} = useSessionManager()

	const handleSessionRemoved = () => {
		fetchSessions()
	}

	useEffect(() => {
		fetchSessions()
	}, [fetchSessions])

	const currentSession = getCurrentSession()
	const activeSessions = (dataSessions ?? []).filter(
		session => session.sessionId !== currentSession?.sessionId
	)
	return (
		<div className='space-y-4'>
			<Heading title={t('info.current')} size='sm' />
			{isLoadingSessions ? (
				<ToggleCardSkeleton />
			) : // <SessionItem session={currentSession} isCurrentSession/>
			currentSession?.metadata ? (
				<SessionItem session={currentSession} isCurrentSession />
			) : (
				<div>No session data</div>
			)}
			<Heading title={t('info.active')} size='sm' />
			{isLoadingSessions ? (
				Array.from({ length: 3 }).map((_, index) => (
					<ToggleCardSkeleton key={index} />
				))
			) : activeSessions.length ? (
				activeSessions.map((session, index) => (
					<SessionItem
						key={index}
						session={session}
						onSessionRemoved={handleSessionRemoved}
					/>
				))
			) : (
				<div className='text-muted-forengorund'>
					{t('info.notFound')}
				</div>
			)}
		</div>
	)
}
