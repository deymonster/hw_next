'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { NextIntlClientProvider } from "next-intl";
import {GeistSans} from 'geist/font/sans';
import { ThemeProvider } from "@/providers/Themeprovider";
import { ToastProvider } from "@/providers/ToastProvider";
import { SessionProvider } from "next-auth/react";
import { SWRProvider } from '@/providers/SWRProvider';
import { ColorSwitcher } from "@/components/ui/elements/ColorSwitcher";
import { timeZone } from '@/libs/i18n/client'

interface RootLayoutClientProps {
  children: React.ReactNode;
  locale: string;
  messages: any;
  timeZone: string;
}

export function RootLayoutClient({ children, locale, messages, timeZone }: RootLayoutClientProps) {
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
          <SessionProvider>
            <ThemeProvider 
              attribute="class"
              defaultTheme="dark"
              disableTransitionOnChange
            >
              <ToastProvider />
              <SWRProvider>
                {children}
              </SWRProvider>
            </ThemeProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}