'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GeistSans } from 'geist/font/sans'
import { SessionProvider } from 'next-auth/react'
import { AbstractIntlMessages, NextIntlClientProvider } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { DatabaseProvider } from '@/components/database/DatabaseProvider'
import { ColorSwitcher } from '@/components/ui/elements/ColorSwitcher'
import { DevicesProvider } from '@/contexts/DeviceContext'
import type { DatabaseCheckResult } from '@/libs/database-checker'
import { SWRProvider } from '@/providers/SWRProvider'
import { ThemeProvider } from '@/providers/Themeprovider'
import { ToastProvider } from '@/providers/ToastProvider'

// добавляем провайдер

interface RootLayoutClientProps {
	children: React.ReactNode
	locale: string
	messages: AbstractIntlMessages
	timeZone: string
	databaseCheck?: DatabaseCheckResult
}

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60, // данные считаются свежими 1 минуту
			refetchOnWindowFocus: false // отключаем автообновление при фокусе окна
		}
	}
})

export function RootLayoutClient({
	children,
	locale,
	messages,
	timeZone,
	databaseCheck
}: RootLayoutClientProps) {
	const searchParams = useSearchParams()
	const router = useRouter()

	useEffect(() => {
		if (searchParams.get('refresh') === 'true') {
			const url = new URL(window.location.href)
			url.searchParams.delete('refresh')
			window.history.replaceState({}, '', url)
			router.refresh()
		}
	}, [searchParams, router])

	return (
		<html lang={locale} suppressHydrationWarning>
			<body className={GeistSans.variable}>
				<ColorSwitcher />
				<NextIntlClientProvider
					messages={messages}
					locale={locale}
					timeZone={timeZone}
				>
					<DatabaseProvider initialCheck={databaseCheck}>
						<SessionProvider>
							<ThemeProvider
								attribute='class'
								defaultTheme='dark'
								disableTransitionOnChange
							>
								<QueryClientProvider client={queryClient}>
									<DevicesProvider>
										<ToastProvider />
										<SWRProvider>{children}</SWRProvider>
									</DevicesProvider>
								</QueryClientProvider>
							</ThemeProvider>
						</SessionProvider>
					</DatabaseProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	)
}
