import type { Metadata } from "next";

import '@/styles/globals.css';
import '@/styles/themes.css'

import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import {GeistSans} from 'geist/font/sans';
import { ThemeProvider } from "@/providers/Themeprovider";
import { ToastProvider } from "@/providers/ToastProvider";
import { SessionProvider } from "next-auth/react";
import { SWRProvider } from '@/providers/SWRProvider';
import { ColorSwitcher } from "@/components/ui/elements/ColorSwitcher";



export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Network Monitoring Dashboard",
  description: "Monitor and analyze network performance.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={GeistSans.variable}>
        <ColorSwitcher />
        <NextIntlClientProvider messages={messages} locale={locale}>
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
  );
}
