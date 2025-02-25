

import { DevicesTable } from '@/components/features/devices/table/DeviceTable'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'


export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.devices.header')

  return {
    title: t('heading'),
    description: t('description'),
    robots: {
      index: false,
      follow: false
    }
  }
}

export default function DevicesPage() {
  return <DevicesTable />
}