import { Department, Device, PrismaClient } from '@prisma/client'

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

	async create(data: IDepartmentCreateInput): Promise<Department> {
		const { devices, ...departmentData } = data

		const department = await this.model.create({
			data: departmentData as IDepartmentCreateInput
		})

		if (devices) {
			const connectIds = new Set<string>([
				...(devices.connect?.map(device => device.id) ?? []),
				...(devices.set?.map(device => device.id) ?? [])
			])

			if (connectIds.size > 0) {
				await this.prisma.device.updateMany({
					where: { id: { in: Array.from(connectIds) } },
					data: { departmentId: department.id }
				})
			}
		}

		return department
	}

	async findByName(name: string): Promise<Department | null> {
		return await this.model.findFirst({
			where: { name }
		})
	}

	async update(
		id: string,
		data: Partial<IDepartmentCreateInput>
	): Promise<Department> {
		const { devices, ...departmentData } = data

		if (devices) {
			if (devices.set) {
				const targetIds = devices.set.map(device => device.id)

				await this.prisma.device.updateMany({
					where: {
						departmentId: id,
						id: { notIn: targetIds }
					},
					data: { departmentId: null, employeeId: null }
				})

				if (targetIds.length > 0) {
					await this.prisma.device.updateMany({
						where: { id: { in: targetIds } },
						data: { departmentId: id }
					})
				}
			} else {
				const disconnectIds =
					devices.disconnect?.map(device => device.id) ?? []
				const connectIds =
					devices.connect?.map(device => device.id) ?? []

				if (disconnectIds.length > 0) {
					await this.prisma.device.updateMany({
						where: { id: { in: disconnectIds } },
						data: { departmentId: null, employeeId: null }
					})
				}

				if (connectIds.length > 0) {
					await this.prisma.device.updateMany({
						where: { id: { in: connectIds } },
						data: { departmentId: id }
					})
				}
			}
		}

		return await this.model.update({
			where: { id },
			data: departmentData as Partial<IDepartmentCreateInput>
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

	async findByIdWithCounts(id: string): Promise<
		| (Department & {
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
		  })
		| null
	> {
		const department = await this.model.findUnique({
			where: { id },
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
			}
		})

		if (!department) {
			return null
		}

		const [deviceCount, employeesCount] = await Promise.all([
			this.getDevicesCount(id),
			this.getEmployeesCount(id)
		])

		return {
			...department,
			deviceCount,
			employeesCount,
			employees: department.employees,
			devices: department.devices
		}
	}
}
