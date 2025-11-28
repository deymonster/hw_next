import { Device, DeviceStatus, DeviceType } from '@prisma/client'

export interface DeviceFilterOptions {
	status?: DeviceStatus[]
	type?: DeviceType
	departmentId?: string
	employeeId?: string
	orderBy?: {
		field: 'name' | 'lastUpdate' | 'lastSeen'
		direction: 'asc' | 'desc'
	}
	OR?: Array<{ departmentId: string }>
}

export interface IDeviceCreateInput {
	name: string
	ipAddress: string
	agentKey: string
	type: DeviceType
	deviceTag?: string
	departmentId?: string
	employeeId?: string
	purchaseDate?: Date
	warrantyPeriod?: number // 12, 24, 36, 48, 60 месяцев
}

export interface IDeviceFindManyArgs {
        where?: {
                status?: DeviceStatus
                type?: DeviceType
                departmentId?: string
                employeeId?: string
        }
        orderBy?: {
                [key: string]: 'asc' | 'desc'
        }
	take?: number
	skip?: number
}

/** Данные для записи активации устройства */
export interface DeviceActivationUpdateInput {
	activationSig: string
	activationKeyVer: number
	activatedAt: Date | string
}

export interface IDeviceRepository {
	// Базовые операции наследуются из IBaseRepository

	// Специфичные методы для устройств
	findByAgentKey(agentKey: string): Promise<Device | null>
	findByIpAddress(ipAddress: string): Promise<Device | null>
	findByLocation(departmentId: string): Promise<Device[]>
	findActiveDevices(): Promise<Device[]>
	updateStatus(id: string, status: DeviceStatus): Promise<Device>
	updateLastSeen(id: string): Promise<Device>
	updateActivation(
		id: string,
		data: DeviceActivationUpdateInput
	): Promise<Device>
	updateDepartmentDevices(
		departmentId: string,
		deviceIds: string[]
	): Promise<void>
	assignDevicesToEmployee(params: {
		departmentId: string
		employeeId: string
		deviceIds: string[]
	}): Promise<void>
}

export interface IDeviceUpdateInput {
	purchaseDate?: Date
	warrantyPeriod?: number
}

export type IDeviceUpdateData = Partial<Omit<Device, 'id'>> & {
	createdAt?: Date
	updatedAt?: Date
}

// Добавляем константы для периодов гарантии
export const WARRANTY_PERIODS = [
	{ value: 12, label: '12 месяцев' },
	{ value: 24, label: '24 месяца' },
	{ value: 36, label: '36 месяцев' },
	{ value: 48, label: '48 месяцев' },
	{ value: 60, label: '60 месяцев' }
] as const

export type WarrantyPeriod = (typeof WARRANTY_PERIODS)[number]['value']
