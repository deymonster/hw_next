'use server'

import { Department, EventSeverity, EventType } from '@prisma/client'

import { logAuditEvent } from './utils/audit-events'

import { DepartmentWithCounts } from '@/hooks/useDepartment'
import { IDepartmentCreateInput } from '@/services/department/department.interface'
import { services } from '@/services/index'

export async function getDepartments(): Promise<Department[]> {
	return await services.data.department.findAll()
}

export async function createDepartment(
	data: IDepartmentCreateInput
): Promise<Department> {
	const department = await services.data.department.create(data)

	await logAuditEvent({
		type: EventType.SYSTEM,
		severity: EventSeverity.LOW,
		title: 'Создан отдел',
		message: `Создан новый отдел "${department.name}".`,
		metadata: {
			departmentId: department.id,
			name: department.name,
			description: department.description
		}
	})

	return department
}

export async function updateDepartment(
	id: string,
	data: Partial<IDepartmentCreateInput>
): Promise<Department> {
	const existingDepartment = await services.data.department.findById(id)

	if (!existingDepartment) {
		throw new Error('Отдел не найден')
	}

	const department = await services.data.department.update(id, data)

	await logAuditEvent({
		type: EventType.SYSTEM,
		severity: EventSeverity.MEDIUM,
		title: 'Обновлен отдел',
		message: `Отдел "${department.name}" обновлен.`,
		metadata: {
			departmentId: department.id,
			previous: {
				name: existingDepartment.name,
				description: existingDepartment.description
			},
			current: {
				name: department.name,
				description: department.description
			}
		}
	})

	return department
}

export async function deleteDepartment(id: string): Promise<Department> {
	const department = await services.data.department.delete(id)

	await logAuditEvent({
		type: EventType.SYSTEM,
		severity: EventSeverity.HIGH,
		title: 'Удален отдел',
		message: `Отдел "${department.name}" удален из системы.`,
		metadata: {
			departmentId: department.id,
			name: department.name
		}
	})

	return department
}

export async function getDepartmentDevicesCount(id: string): Promise<number> {
	return await services.data.department.getDevicesCount(id)
}

export async function getDepartmentsWithCounts(): Promise<
	DepartmentWithCounts[]
> {
	return await services.data.department.findAllWithCounts()
}

export async function getDepartmentForManagement(
	id: string
): Promise<DepartmentWithCounts | null> {
	return await services.data.department.findByIdWithCounts(id)
}
