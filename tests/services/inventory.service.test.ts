import { DeviceStatus, DeviceType, PrismaClient, Role } from '@prisma/client'
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import { InventoryService } from '../../services/inventory/inventory.service'
import { createMockPrisma } from '../utils/mockPrisma'

const now = new Date()

const user = {
	id: 'user-1',
	email: 'user@example.com',
	name: 'Test User',
	password: 'hashed',
	role: Role.USER,
	createdAt: now,
	updatedAt: now,
	emailVerified: false,
	verificationToken: null,
	resetToken: null,
	resetTokenExpires: null,
	image: null
}

const department = {
	id: 'dept-1',
	name: 'Operations',
	description: null,
	createdAt: now,
	updatedAt: now
}

const employee = {
	id: 'emp-1',
	firstName: 'Alex',
	lastName: 'Smirnov',
	email: null,
	phone: null,
	position: 'Technician',
	departmentId: 'dept-1'
}

const device = {
	id: 'dev-1',
	name: 'Laptop',
	ipAddress: '10.2.0.10',
	agentKey: 'agent-100',
	serialNumber: null,
	purchaseDate: null,
	warrantyPeriod: null,
	lastUpdate: now,
	status: DeviceStatus.ACTIVE,
	type: DeviceType.WINDOWS,
	departmentId: 'dept-1',
	employeeId: 'emp-1',
	deviceTag: null,
	createdAt: now,
	updatedAt: now,
	lastSeen: now,
	activationSig: null,
	activationKeyVer: null,
	activatedAt: null
}

describe('InventoryService', () => {
	let context: ReturnType<typeof createMockPrisma>
	let service: InventoryService

	beforeEach(() => {
		context = createMockPrisma({
			users: [user],
			departments: [department],
			employees: [employee],
			devices: [device]
		})
		service = new InventoryService(
			context.client as unknown as PrismaClient
		)
	})

	it('creates inventory with linked departments and user', async () => {
		const inventory = await service.create({
			userId: 'user-1',
			departments: { connect: [{ id: 'dept-1' }] }
		})

		assert.strictEqual(context.state.inventories.length, 1)

		const fetched = (await service.findWithItems(inventory.id)) as any
		assert.strictEqual(fetched.user.id, 'user-1')
		assert.strictEqual(fetched.departments[0].id, 'dept-1')
	})

	it('adds inventory items using device assignment defaults', async () => {
		const inventory = await service.create({ userId: 'user-1' })

		const item = await service.addItem(inventory.id, {
			deviceId: 'dev-1'
		} as any)

		assert.strictEqual(item.deviceId, 'dev-1')
		assert.strictEqual(item.employeeId, 'emp-1')
		assert.strictEqual(item.departmentId, 'dept-1')

		const detailed = (await service.findWithItems(inventory.id)) as any
		assert.strictEqual(detailed.items.length, 1)
		assert.strictEqual(detailed.items[0].device?.id, 'dev-1')
		assert.strictEqual(detailed.items[0].employee?.id, 'emp-1')
	})

	it('removes inventory items and validates existence', async () => {
		const inventory = await service.create({ userId: 'user-1' })
		const item = await service.addItem(inventory.id, {
			deviceId: 'dev-1'
		} as any)

		await service.removeItem(inventory.id, item.id)
		assert.strictEqual(context.state.inventoryItems.length, 0)

		await assert.rejects(
			service.removeItem(inventory.id, item.id),
			/Элемент инвентаризации не найден/
		)
	})

	it('deletes inventory with related items', async () => {
		const inventory = await service.create({ userId: 'user-1' })
		await service.addItem(inventory.id, { deviceId: 'dev-1' } as any)

		await service.delete(inventory.id)

		assert.strictEqual(context.state.inventories.length, 0)
		assert.strictEqual(context.state.inventoryItems.length, 0)
	})

	it('returns latest inventory for user', async () => {
		const olderDate = new Date('2023-01-01T00:00:00.000Z')
		await service.create({ userId: 'user-1', startDate: olderDate })
		const latestDate = new Date('2024-01-01T00:00:00.000Z')
		const latest = await service.create({
			userId: 'user-1',
			startDate: latestDate
		})

		const found = await service.getLatestInventory('user-1')
		assert.strictEqual(found?.id, latest.id)
	})

	it('fetches all inventories with nested data', async () => {
		const inventory = await service.create({
			userId: 'user-1',
			departments: { connect: [{ id: 'dept-1' }] }
		})
		await service.addItem(inventory.id, { deviceId: 'dev-1' } as any)

		const inventories = (await service.findAllWithItems({
			include: {
				items: {
					include: { device: true, employee: true, department: true }
				},
				user: true
			}
		})) as any

		assert.strictEqual(inventories.length, 1)
		assert.strictEqual(inventories[0].items[0].device?.id, 'dev-1')
		assert.strictEqual(inventories[0].items[0].employee?.id, 'emp-1')
		assert.strictEqual(inventories[0].user?.id, 'user-1')
	})
})
