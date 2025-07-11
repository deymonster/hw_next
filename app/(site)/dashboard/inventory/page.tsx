import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { InventoryTable } from '@/components/features/inventory/table/InventoryTable'
import { InventoryProvider } from '@/contexts/InventoryContext'

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

export default function InventoryPage() {
	return (
		<>
			<InventoryProvider>
				<InventoryTable />
			</InventoryProvider>
		</>
	)
}
