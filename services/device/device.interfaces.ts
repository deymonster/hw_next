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
}

export interface IDeviceFindManyArgs {
	where?: {
		status?: DeviceStatus
		type?: DeviceType
		departmentId?: string
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
	updateActivation(
		id: string,
		data: DeviceActivationUpdateInput
	): Promise<Device>
	updateDepartmentDevices(
		departmentId: string,
		deviceIds: string[]
	): Promise<void>
}
