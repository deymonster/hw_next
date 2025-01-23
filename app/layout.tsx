import type { Metadata } from "next";
import '@/styles/globals.css';
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import {GeistSans} from 'geist/font/sans';
import { ThemeProvider } from "@/providers/Themeprovider";
import { ToastProvider } from "@/providers/ToastProvider";
import { SessionProvider } from "next-auth/react";


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
        <NextIntlClientProvider messages={messages} locale={locale}>
        <SessionProvider> 
          <ThemeProvider 
            attribute="class"
            defaultTheme="dark"
            disableTransitionOnChange
          >
            <ToastProvider />
            {children}
          </ThemeProvider>
        </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
