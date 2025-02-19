import { createSharedPathnamesNavigation } from 'next-intl/navigation';

export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation({
  locales: ['en', 'ru'],
  defaultLocale: 'ru'
});

export const timeZone = 'Europe/Yekaterinburg';