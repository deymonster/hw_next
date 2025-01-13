import type { Metadata } from "next";
import '@/styles/globals.css';
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import {GeistSans} from 'geist/font/sans';
import { ThemeProvider } from "@/providers/Themeprovider";
import { ToastProvider } from "@/providers/ToastProvider";

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
        {/* <header className="bg-blue-600 text-white p-4">
          <h1 className="text-lg font-bold">Monitoring Dashboard</h1>
        </header> */}
        {/* <main className="container mx-auto p-4"> */}
            <NextIntlClientProvider messages={messages}>
              <ThemeProvider 
                attribute="class"
                defaultTheme="dark"
                disableTransitionOnChange
              >
                <ToastProvider />
                {children}
              </ThemeProvider>
            </NextIntlClientProvider>
        {/* </main> */}
        {/* <footer className="bg-gray-800 text-white p-4 text-center">
          &copy; 2024 Monitoring System
        </footer> */}
      </body>
    </html>
  );
}
