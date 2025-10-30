import { DeviceStatus, DeviceType, PrismaClient } from '@prisma/client'
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import { EmployeeService } from '../../services/employee/employee.service'
import { createMockPrisma } from '../utils/mockPrisma'

const baseDepartment = (id: string, name = 'IT') => {
	const now = new Date()
	return {
		id,
		name,
		description: null,
		createdAt: now,
		updatedAt: now
	}
}

describe('EmployeeService', () => {
	let prismaContext: ReturnType<typeof createMockPrisma>
	let service: EmployeeService

	beforeEach(() => {
		prismaContext = createMockPrisma({
			departments: [
				baseDepartment('dept-1', 'IT'),
				baseDepartment('dept-2', 'Support')
			],
			devices: [],
			employees: []
		})
		service = new EmployeeService(
			prismaContext.client as unknown as PrismaClient
		)
	})

	it('creates an employee with department link', async () => {
		const employee = (await service.create({
			firstName: 'Ivan',
			lastName: 'Ivanov',
			email: 'ivan@example.com',
			departmentId: 'dept-1'
		})) as any

		assert.ok(employee.id)
		assert.strictEqual(employee.department?.id, 'dept-1')
		assert.deepStrictEqual(employee.devices, [])
	})

	it('throws when creating employee with duplicate email', async () => {
		await service.create({
			firstName: 'Anna',
			lastName: 'Petrova',
			email: 'duplicate@example.com'
		})

		await assert.rejects(
			service.create({
				firstName: 'Boris',
				lastName: 'Smirnov',
				email: 'duplicate@example.com'
			}),
			/Сотрудник с таким email уже существует/
		)
	})

	it('throws when creating employee with missing department', async () => {
		await assert.rejects(
			service.create({
				firstName: 'Ivan',
				lastName: 'Sidorov',
				departmentId: 'missing'
			}),
			/Указанный отдел не существует/
		)
	})

	it('updates employee and changes department assignment', async () => {
		const employee = await service.create({
			firstName: 'Olga',
			lastName: 'Nikolaeva',
			departmentId: 'dept-1'
		})

		const updated = (await service.update(employee.id, {
			departmentId: 'dept-2',
			position: 'Manager'
		})) as any

		assert.strictEqual(updated.department?.id, 'dept-2')
		assert.strictEqual(updated.position, 'Manager')
	})

	it('deletes employee and unassigns devices when allowed', async () => {
		const { state } = prismaContext
		const employee = await service.create({
			firstName: 'Mark',
			lastName: 'Twain'
		})

		state.devices.push({
			id: 'device-1',
			name: 'Laptop',
			ipAddress: '10.0.0.1',
			agentKey: 'agent-1',
			serialNumber: null,
			purchaseDate: null,
			warrantyPeriod: null,
			lastUpdate: new Date(),
			status: DeviceStatus.ACTIVE,
			type: DeviceType.WINDOWS,
			departmentId: null,
			employeeId: employee.id,
			deviceTag: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			lastSeen: new Date(),
			activationSig: null,
			activationKeyVer: null,
			activatedAt: null
		})

		const deleted = await service.delete(employee.id, true)

		assert.strictEqual(deleted.id, employee.id)
		assert.strictEqual(state.devices[0].employeeId, null)
	})

	it('prevents deletion when devices remain assigned', async () => {
		const employee = await service.create({
			firstName: 'Kate',
			lastName: 'Novikova'
		})

		prismaContext.state.devices.push({
			id: 'device-2',
			name: 'Desktop',
			ipAddress: '10.0.0.2',
			agentKey: 'agent-2',
			serialNumber: null,
			purchaseDate: null,
			warrantyPeriod: null,
			lastUpdate: new Date(),
			status: DeviceStatus.ACTIVE,
			type: DeviceType.WINDOWS,
			departmentId: null,
			employeeId: employee.id,
			deviceTag: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			lastSeen: new Date(),
			activationSig: null,
			activationKeyVer: null,
			activatedAt: null
		})

		await assert.rejects(
			service.delete(employee.id, false),
			/Невозможно удалить сотрудника, за которым закреплены устройства/
		)
		assert.strictEqual(
			prismaContext.state.devices[0].employeeId,
			employee.id
		)
	})
})
