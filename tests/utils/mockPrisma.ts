import {
	Department,
	Device,
	DeviceStatus,
	DeviceType,
	Employee,
	Inventory,
	InventoryItem,
	NotificationSettings,
	PrismaClient,
	User
} from '@prisma/client'
import { randomUUID } from 'node:crypto'

type OrderDirection = 'asc' | 'desc'

type WhereInput<T> = Record<string, any>

type IncludeInput = Record<string, any>

type SelectInput = Record<string, boolean>

export interface MockPrismaState {
	employees: Employee[]
	departments: Department[]
	devices: Device[]
	inventories: Inventory[]
	inventoryItems: InventoryItem[]
	notificationSettings: NotificationSettings[]
	users: User[]
	inventoryDepartments: Map<string, string[]>
}

export interface MockPrismaContext {
	client: PrismaClient
	state: MockPrismaState
}

interface CreateMockPrismaArgs {
	employees?: Employee[]
	departments?: Department[]
	devices?: Device[]
	inventories?: Inventory[]
	inventoryItems?: InventoryItem[]
	notificationSettings?: NotificationSettings[]
	users?: User[]
	inventoryDepartments?: Record<string, string[]>
}

function matchesWhere<T extends Record<string, any>>(
	entity: T,
	where?: WhereInput<T>
): boolean {
	if (!where) {
		return true
	}

	return Object.entries(where).every(([key, value]) => {
		if (key === 'OR' && Array.isArray(value)) {
			return value.some(condition => matchesWhere(entity, condition))
		}

		const actual = entity[key]

		if (value && typeof value === 'object') {
			if ('contains' in value) {
				if (typeof actual !== 'string') return false
				return actual
					.toLowerCase()
					.includes(String(value.contains).toLowerCase())
			}
			if ('in' in value && Array.isArray(value.in)) {
				return value.in.includes(actual)
			}
			if ('equals' in value) {
				return actual === value.equals
			}
		}

		if (value === undefined) {
			return true
		}

		return actual === value
	})
}

function applyOrder<T>(
	items: T[],
	orderBy?: Record<string, OrderDirection>
): T[] {
	if (!orderBy) {
		return [...items]
	}

	const [[field, direction]] = Object.entries(orderBy)
	return [...items].sort((a: any, b: any) => {
		const aValue = a[field]
		const bValue = b[field]
		if (aValue === bValue) return 0
		if (aValue === undefined) return direction === 'asc' ? -1 : 1
		if (bValue === undefined) return direction === 'asc' ? 1 : -1
		if (aValue > bValue) return direction === 'asc' ? 1 : -1
		return direction === 'asc' ? -1 : 1
	})
}

function selectFields<T>(entity: T, select: SelectInput): Partial<T> {
	return Object.entries(select).reduce((acc, [key, enabled]) => {
		if (enabled) {
			acc[key as keyof T] = (entity as any)[key]
		}
		return acc
	}, {} as Partial<T>)
}

function applyEmployeeInclude(
	employee: Employee,
	include: IncludeInput | undefined,
	state: MockPrismaState
): any {
	if (!include) {
		return { ...employee }
	}

	const result: any = { ...employee }

	if (include.department) {
		result.department =
			state.departments.find(
				department => department.id === employee.departmentId
			) ?? null
	}

	if (include.devices) {
		result.devices = state.devices.filter(
			device => device.employeeId === employee.id
		)
	}

	return result
}

function applyDepartmentInclude(
	department: Department,
	include: IncludeInput | undefined,
	state: MockPrismaState
): any {
	if (!include) {
		return { ...department }
	}

	const result: any = { ...department }

	if (include.employees) {
		const employees = state.employees.filter(
			emp => emp.departmentId === department.id
		)
		if (include.employees.select) {
			result.employees = employees.map(emp =>
				selectFields(emp, include.employees.select)
			)
		} else {
			result.employees = employees
		}
	}

	if (include.devices) {
		result.devices = state.devices.filter(
			device => device.departmentId === department.id
		)
	}

	return result
}

function applyInventoryItemInclude(
	item: InventoryItem,
	include: IncludeInput | undefined,
	state: MockPrismaState
): any {
	if (!include) {
		return { ...item }
	}

	const result: any = { ...item }

	if (include.device) {
		result.device =
			state.devices.find(device => device.id === item.deviceId) ?? null
	}

	if (include.employee) {
		result.employee =
			state.employees.find(employee => employee.id === item.employeeId) ??
			null
	}

	if (include.department) {
		result.department =
			state.departments.find(
				department => department.id === item.departmentId
			) ?? null
	}

	return result
}

function applyInventoryInclude(
	inventory: Inventory,
	include: IncludeInput | undefined,
	state: MockPrismaState
): any {
	if (!include) {
		return { ...inventory }
	}

	const result: any = { ...inventory }

	if (include.items) {
		const items = state.inventoryItems.filter(
			item => item.inventoryId === inventory.id
		)
		if (include.items === true) {
			result.items = items.map(item => ({ ...item }))
		} else if (include.items.include) {
			result.items = items.map(item =>
				applyInventoryItemInclude(item, include.items.include, state)
			)
		} else {
			result.items = items.map(item => ({ ...item }))
		}
	}

	if (include.departments) {
		const departmentIds = state.inventoryDepartments.get(inventory.id) ?? []
		result.departments = departmentIds
			.map(
				id =>
					state.departments.find(
						department => department.id === id
					) ?? null
			)
			.filter(Boolean)
	}

	if (include.user) {
		result.user =
			state.users.find(user => user.id === inventory.userId) ?? null
	}

	return result
}

export function createMockPrisma(
	initial?: CreateMockPrismaArgs
): MockPrismaContext {
	const state: MockPrismaState = {
		employees: initial?.employees ? [...initial.employees] : [],
		departments: initial?.departments ? [...initial.departments] : [],
		devices: initial?.devices ? [...initial.devices] : [],
		inventories: initial?.inventories ? [...initial.inventories] : [],
		inventoryItems: initial?.inventoryItems
			? [...initial.inventoryItems]
			: [],
		notificationSettings: initial?.notificationSettings
			? [...initial.notificationSettings]
			: [],
		users: initial?.users ? [...initial.users] : [],
		inventoryDepartments: new Map(
			Object.entries(initial?.inventoryDepartments ?? {}).map(
				([key, value]) => [key, [...value]]
			)
		)
	}

	const prismaLike = {
		employee: {
			findFirst: async ({ where }: { where?: WhereInput<Employee> }) => {
				return (
					state.employees.find(employee =>
						matchesWhere(employee, where)
					) ?? null
				)
			},
			findUnique: async ({
				where,
				include
			}: {
				where: { id?: string; email?: string }
				include?: IncludeInput
			}) => {
				const employee = state.employees.find(emp => {
					if (where.id) return emp.id === where.id
					if (where.email) return emp.email === where.email
					return false
				})
				return employee
					? applyEmployeeInclude(employee, include, state)
					: null
			},
			findMany: async ({
				where,
				include,
				orderBy
			}: {
				where?: WhereInput<Employee>
				include?: IncludeInput
				orderBy?: Record<string, OrderDirection>
			} = {}) => {
				const filtered = state.employees.filter(employee =>
					matchesWhere(employee, where)
				)
				const sorted = applyOrder(filtered, orderBy)
				return sorted.map(employee =>
					applyEmployeeInclude(employee, include, state)
				)
			},
			count: async ({ where }: { where?: WhereInput<Employee> } = {}) => {
				return state.employees.filter(employee =>
					matchesWhere(employee, where)
				).length
			},
			create: async ({
				data,
				include
			}: {
				data: Partial<Employee>
				include?: IncludeInput
			}) => {
				const newEmployee: Employee = {
					id: data.id ?? randomUUID(),
					firstName: data.firstName ?? '',
					lastName: data.lastName ?? '',
					email: (data.email ?? null) as string | null,
					phone: (data.phone ?? null) as string | null,
					position: (data.position ?? null) as string | null,
					departmentId: (data.departmentId ?? null) as string | null
				}
				state.employees.push(newEmployee)
				return applyEmployeeInclude(newEmployee, include, state)
			},
			update: async ({
				where,
				data,
				include
			}: {
				where: { id: string }
				data: Partial<Employee>
				include?: IncludeInput
			}) => {
				const employee = state.employees.find(
					emp => emp.id === where.id
				)
				if (!employee) {
					throw new Error('Employee not found')
				}
				Object.assign(employee, data)
				return applyEmployeeInclude(employee, include, state)
			},
			delete: async ({
				where,
				include
			}: {
				where: { id: string }
				include?: IncludeInput
			}) => {
				const index = state.employees.findIndex(
					emp => emp.id === where.id
				)
				if (index === -1) {
					throw new Error('Employee not found')
				}
				const [removed] = state.employees.splice(index, 1)
				return applyEmployeeInclude(removed, include, state)
			}
		},
		department: {
			findFirst: async ({
				where
			}: {
				where?: WhereInput<Department>
			}) => {
				return (
					state.departments.find(department =>
						matchesWhere(department, where)
					) ?? null
				)
			},
			findUnique: async ({ where }: { where: { id: string } }) => {
				return (
					state.departments.find(
						department => department.id === where.id
					) ?? null
				)
			},
			findMany: async ({
				where,
				include,
				orderBy
			}: {
				where?: WhereInput<Department>
				include?: IncludeInput
				orderBy?: Record<string, OrderDirection>
			} = {}) => {
				const filtered = state.departments.filter(department =>
					matchesWhere(department, where)
				)
				const sorted = applyOrder(filtered, orderBy)
				return sorted.map(department =>
					applyDepartmentInclude(department, include, state)
				)
			},
			create: async ({ data }: { data: Partial<Department> }) => {
				const now = new Date()
				const department: Department = {
					id: data.id ?? randomUUID(),
					name: data.name ?? '',
					description: (data.description ?? null) as string | null,
					createdAt: data.createdAt ?? now,
					updatedAt: data.updatedAt ?? now
				}
				state.departments.push(department)
				return { ...department }
			},
			update: async ({
				where,
				data
			}: {
				where: { id: string }
				data: Partial<Department>
			}) => {
				const department = state.departments.find(
					dep => dep.id === where.id
				)
				if (!department) {
					throw new Error('Department not found')
				}
				Object.assign(department, data, {
					updatedAt: data.updatedAt ?? new Date()
				})
				return { ...department }
			},
			delete: async ({ where }: { where: { id: string } }) => {
				const index = state.departments.findIndex(
					dep => dep.id === where.id
				)
				if (index === -1) {
					throw new Error('Department not found')
				}
				const [removed] = state.departments.splice(index, 1)
				return { ...removed }
			}
		},
		device: {
			findUnique: async ({
				where,
				select,
				include
			}: {
				where: { id?: string; agentKey?: string }
				select?: SelectInput
				include?: IncludeInput
			}) => {
				const device = state.devices.find(dev => {
					if (where.id) return dev.id === where.id
					if (where.agentKey) return dev.agentKey === where.agentKey
					return false
				})
				if (!device) {
					return null
				}
				if (select) {
					return selectFields(device, select)
				}
				const result: any = { ...device }
				if (include?.employee) {
					result.employee =
						state.employees.find(
							employee => employee.id === device.employeeId
						) ?? null
				}
				if (include?.department) {
					result.department =
						state.departments.find(
							department => department.id === device.departmentId
						) ?? null
				}
				return result
			},
			findFirst: async ({ where }: { where?: WhereInput<Device> }) => {
				return (
					state.devices.find(device => matchesWhere(device, where)) ??
					null
				)
			},
			findMany: async ({
				where,
				orderBy
			}: {
				where?: WhereInput<Device>
				orderBy?: Record<string, OrderDirection>
			} = {}) => {
				const filtered = state.devices.filter(device =>
					matchesWhere(device, where)
				)
				return applyOrder(filtered, orderBy).map(device => ({
					...device
				}))
			},
			create: async ({ data }: { data: Partial<Device> }) => {
				const now = new Date()
				const device: Device = {
					id: data.id ?? randomUUID(),
					name: data.name ?? '',
					ipAddress: data.ipAddress ?? '',
					agentKey: data.agentKey ?? randomUUID(),
					serialNumber: (data.serialNumber ?? null) as string | null,
					purchaseDate: (data.purchaseDate ?? null) as Date | null,
					warrantyPeriod: (data.warrantyPeriod ?? null) as
						| number
						| null,
					lastUpdate: data.lastUpdate ?? now,
					status: data.status ?? DeviceStatus.ACTIVE,
					type: data.type ?? DeviceType.WINDOWS,
					departmentId: (data.departmentId ?? null) as string | null,
					employeeId: (data.employeeId ?? null) as string | null,
					deviceTag: (data.deviceTag ?? null) as string | null,
					createdAt: data.createdAt ?? now,
					updatedAt: data.updatedAt ?? now,
					lastSeen: (data.lastSeen ?? now) as Date | null,
					activationSig: (data.activationSig ?? null) as
						| string
						| null,
					activationKeyVer: (data.activationKeyVer ?? null) as
						| number
						| null,
					activatedAt: (data.activatedAt ?? null) as Date | null
				}
				state.devices.push(device)
				return { ...device }
			},
			update: async ({
				where,
				data
			}: {
				where: { id: string }
				data: Partial<Device>
			}) => {
				const device = state.devices.find(dev => dev.id === where.id)
				if (!device) {
					throw new Error('Device not found')
				}
				Object.assign(device, data, {
					updatedAt: data.updatedAt ?? new Date()
				})
				return { ...device }
			},
			updateMany: async ({
				where,
				data
			}: {
				where: WhereInput<Device>
				data: Partial<Device>
			}) => {
				let count = 0
				state.devices.forEach(device => {
					if (matchesWhere(device, where)) {
						Object.assign(device, data, {
							updatedAt: data.updatedAt ?? new Date()
						})
						count += 1
					}
				})
				return { count }
			},
			delete: async ({ where }: { where: { id: string } }) => {
				const index = state.devices.findIndex(
					device => device.id === where.id
				)
				if (index === -1) {
					throw new Error('Device not found')
				}
				const [removed] = state.devices.splice(index, 1)
				return { ...removed }
			},
			deleteMany: async ({ where }: { where?: WhereInput<Device> }) => {
				const originalLength = state.devices.length
				state.devices = state.devices.filter(
					device => !matchesWhere(device, where)
				)
				return { count: originalLength - state.devices.length }
			},
			count: async ({ where }: { where?: WhereInput<Device> } = {}) => {
				return state.devices.filter(device =>
					matchesWhere(device, where)
				).length
			}
		},
		inventory: {
			findUnique: async ({
				where,
				include
			}: {
				where: { id: string }
				include?: IncludeInput
			}) => {
				const inventory = state.inventories.find(
					inv => inv.id === where.id
				)
				return inventory
					? applyInventoryInclude(inventory, include, state)
					: null
			},
			findMany: async ({
				where,
				orderBy,
				include
			}: {
				where?: WhereInput<Inventory>
				orderBy?: Record<string, OrderDirection>
				include?: IncludeInput
			} = {}) => {
				const filtered = state.inventories.filter(inventory =>
					matchesWhere(inventory, where)
				)
				const sorted = applyOrder(filtered, orderBy)
				return sorted.map(inventory =>
					applyInventoryInclude(inventory, include, state)
				)
			},
			findFirst: async ({
				where,
				include,
				orderBy
			}: {
				where?: WhereInput<Inventory>
				include?: IncludeInput
				orderBy?: Record<string, OrderDirection>
			} = {}) => {
				const filtered = state.inventories.filter(inventory =>
					matchesWhere(inventory, where)
				)
				const sorted = applyOrder(filtered, orderBy)
				const first = sorted[0]
				return first
					? applyInventoryInclude(first, include, state)
					: null
			},
			create: async ({
				data
			}: {
				data: Partial<Inventory> & {
					departments?: { connect: { id: string }[] }
				}
			}) => {
				const now = new Date()
				const inventory: Inventory = {
					id: data.id ?? randomUUID(),
					createdAt: data.createdAt ?? now,
					updatedAt: data.updatedAt ?? now,
					startDate: data.startDate ?? now,
					userId: data.userId ?? ''
				}
				state.inventories.push(inventory)
				const connectedDepartments =
					data.departments?.connect?.map(conn => conn.id) ?? []
				state.inventoryDepartments.set(
					inventory.id,
					connectedDepartments
				)
				return { ...inventory }
			},
			update: async ({
				where,
				data
			}: {
				where: { id: string }
				data: Partial<Inventory>
			}) => {
				const inventory = state.inventories.find(
					inv => inv.id === where.id
				)
				if (!inventory) {
					throw new Error('Inventory not found')
				}
				Object.assign(inventory, data, {
					updatedAt: data.updatedAt ?? new Date()
				})
				return { ...inventory }
			},
			delete: async ({ where }: { where: { id: string } }) => {
				const index = state.inventories.findIndex(
					inv => inv.id === where.id
				)
				if (index === -1) {
					throw new Error('Inventory not found')
				}
				const [removed] = state.inventories.splice(index, 1)
				state.inventoryDepartments.delete(removed.id)
				return { ...removed }
			}
		},
		inventoryItem: {
			create: async ({ data }: { data: Partial<InventoryItem> }) => {
				const now = new Date()
				const item: InventoryItem = {
					id: data.id ?? randomUUID(),
					createdAt: data.createdAt ?? now,
					updatedAt: data.updatedAt ?? now,
					deviceId: (data.deviceId ?? null) as string | null,
					inventoryId: data.inventoryId ?? '',
					processor: (data.processor ?? null) as string | null,
					motherboard: data.motherboard ?? null,
					memory: data.memory ?? null,
					storage: data.storage ?? null,
					networkCards: data.networkCards ?? null,
					videoCards: data.videoCards ?? null,
					diskUsage: data.diskUsage ?? null,
					employeeId: (data.employeeId ?? null) as string | null,
					departmentId: (data.departmentId ?? null) as string | null
				}
				state.inventoryItems.push(item)
				return { ...item }
			},
			findFirst: async ({
				where
			}: {
				where?: WhereInput<InventoryItem>
			}) => {
				return (
					state.inventoryItems.find(item =>
						matchesWhere(item, where)
					) ?? null
				)
			},
			delete: async ({ where }: { where: { id: string } }) => {
				const index = state.inventoryItems.findIndex(
					item => item.id === where.id
				)
				if (index === -1) {
					throw new Error('Inventory item not found')
				}
				const [removed] = state.inventoryItems.splice(index, 1)
				return { ...removed }
			},
			deleteMany: async ({
				where
			}: {
				where?: WhereInput<InventoryItem>
			}) => {
				const originalLength = state.inventoryItems.length
				state.inventoryItems = state.inventoryItems.filter(
					item => !matchesWhere(item, where)
				)
				return { count: originalLength - state.inventoryItems.length }
			}
		},
		notificationSettings: {
			findUnique: async ({
				where
			}: {
				where: { id?: string; userId?: string }
			}) => {
				const notification = state.notificationSettings.find(
					setting => {
						if (where.id) return setting.id === where.id
						if (where.userId) return setting.userId === where.userId
						return false
					}
				)
				return notification ? { ...notification } : null
			},
			update: async ({
				where,
				data
			}: {
				where: { userId: string }
				data: Partial<NotificationSettings>
			}) => {
				const notification = state.notificationSettings.find(
					setting => setting.userId === where.userId
				)
				if (!notification) {
					throw new Error('Notification settings not found')
				}
				Object.assign(notification, data, {
					updatedAt: new Date()
				})
				return { ...notification }
			}
		},
		user: {
			findUnique: async ({ where }: { where: { id: string } }) => {
				return state.users.find(user => user.id === where.id) ?? null
			}
		}
	}

	return {
		client: prismaLike as unknown as PrismaClient,
		state
	}
}
