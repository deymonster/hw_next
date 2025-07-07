import type { Metadata } from 'next'
import { AbstractIntlMessages } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

import { RootLayoutClient } from './RootLayoutClient'

import '@/styles/globals.css'
import '@/styles/themes.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
	title: 'Network Monitoring Dashboard',
	description: 'Monitor and analyze network performance.'
}

export default async function RootLayout({
	children
}: {
	children: React.ReactNode
}) {
	const locale = await getLocale()
	const messages = (await getMessages()) as AbstractIntlMessages

	return (
		<RootLayoutClient
			locale={locale}
			messages={messages}
			timeZone='Europe/Moscow'
		>
			{children}
		</RootLayoutClient>
	)
}
