import { MonitoringTabs } from '@/components/features/alert-rules/MonitoringTabs'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.inventory.header')

  return {
    title: t('heading'),
    description: t('description'),
    robots: {
      index: false,
      follow: false
    }
  }
}

export default function AlertRulesPage() {
  return <MonitoringTabs />
}