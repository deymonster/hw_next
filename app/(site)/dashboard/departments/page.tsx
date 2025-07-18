import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { DepartmentsTable } from '@/components/features/departments/table/DepartmentsTable'

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations('dashboard.departments.header')

	return {
		title: t('heading'),
		description: t('description'),
		robots: {
			index: false,
			follow: false
		}
	}
}

export default function DepartmentsPage() {
	return (
		<>
			<DepartmentsTable />
		</>
	)
}
