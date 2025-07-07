import {
	Department,
	Device,
	DeviceStatus,
	DeviceType,
	PrismaClient
} from '@prisma/client'

import { BaseRepository } from '../base.service'
import {
	DepartmentFilterOptions,
	IDepartmentCreateInput,
	IDepartmentFindManyArgs,
	IDepartmentRepository
} from './department.interface'

export class DepartmentService
	extends BaseRepository<
		Department,
		IDepartmentCreateInput,
		IDepartmentFindManyArgs,
		PrismaClient['department'],
		string
	>
	implements IDepartmentRepository
{
	constructor(prisma: PrismaClient) {
		super(prisma, p => p.department)
	}

	async findByName(name: string): Promise<Department | null> {
		return await this.model.findFirst({
			where: { name }
		})
	}

	async findAll(options?: DepartmentFilterOptions): Promise<Department[]> {
		return await this.model.findMany({
			where: {
				...(options?.name && { name: { contains: options.name } })
			},
			orderBy: options?.orderBy
				? { [options.orderBy.field]: options.orderBy.direction }
				: { name: 'asc' }
		})
	}

	async getDevicesCount(departmentId: string): Promise<number> {
		return await this.prisma.device.count({
			where: { departmentId }
		})
	}

	async getEmployeesCount(departmentId: string): Promise<number> {
		return await this.prisma.employee.count({
			where: { departmentId }
		})
	}

	async findAllWithCounts(): Promise<
		(Department & {
			deviceCount: number
			employeesCount: number
			employees: {
				id: string
				firstName: string
				lastName: string
				email: string | null
				phone: string | null
				position: string | null
			}[]
			devices: Device[]
		})[]
	> {
		const departments = await this.model.findMany({
			include: {
				employees: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
						phone: true,
						position: true
					}
				},
				devices: true
			},
			orderBy: { name: 'asc' }
		})

		const departmentsWithCounts = await Promise.all(
			departments.map(async department => {
				const [deviceCount, employeesCount] = await Promise.all([
					this.getDevicesCount(department.id),
					this.getEmployeesCount(department.id)
				])

				return {
					...department,
					deviceCount,
					employeesCount,
					employees: department.employees,
					devices: department.devices
				}
			})
		)

		return departmentsWithCounts
	}
}
