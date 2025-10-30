import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getDepartmentForManagement } from '@/app/actions/department'
import { DepartmentManager } from '@/components/departments/DepartmentManager'

interface ManageDepartmentPageProps {
	params: { id: string }
}

export async function generateMetadata({
	params
}: ManageDepartmentPageProps): Promise<Metadata> {
	const department = await getDepartmentForManagement(params.id)

	if (!department) {
		return {
			title: 'Отдел не найден'
		}
	}

	return {
		title: `Управление отделом «${department.name}»`,
		description: department.description || 'Страница управления отделом'
	}
}

export default async function ManageDepartmentPage({
	params
}: ManageDepartmentPageProps) {
	const department = await getDepartmentForManagement(params.id)

	if (!department) {
		notFound()
	}

	return <DepartmentManager department={department} />
}
