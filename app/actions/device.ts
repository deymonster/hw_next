'use server'

import {
	Device,
	DeviceStatus,
	DeviceType,
	EventSeverity,
	EventType
} from '@prisma/client'

import { getAgentStatuses } from './prometheus.actions'
import { logAuditEvent } from './utils/audit-events'

import { DeviceFilterOptions } from '@/services/device/device.interfaces'
import { IDeviceCreateInput } from '@/services/device/device.interfaces'
import { services } from '@/services/index'
import { LoggerService } from '@/services/logger/logger.interface'
import { logAction } from '@/utils/logger'

export async function createDevice(data: IDeviceCreateInput): Promise<{
	success: boolean
	device?: Device
	error?: string
}> {
	await logAction(
		LoggerService.DEVICE_SERVICE,
		'info',
		`createDevice - Creating new device: ${data.name}`
	)
	try {
		if (!data.ipAddress || !data.name) {
			throw new Error('IP address and name are required')
		}

		await logAction(
			LoggerService.DEVICE_SERVICE,
			'info',
			`[CREATE_DEVICE] Creating device: ${data.name} (${data.ipAddress})`
		)
		const newDevice = await services.data.device.create({
			name: data.name,
			ipAddress: data.ipAddress,
			agentKey: data.agentKey,
			type: data.type || DeviceType.WINDOWS
		})
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'info',
			`[CREATE_DEVICE] Device created successfully: ${newDevice.id}`
		)

		await logAuditEvent({
			type: EventType.DEVICE,
			severity: EventSeverity.MEDIUM,
			title: 'Добавлено устройство',
			message: `Устройство "${newDevice.name}" с IP ${newDevice.ipAddress} добавлено в систему.`,
			deviceId: newDevice.id,
			metadata: {
				ipAddress: newDevice.ipAddress,
				agentKey: newDevice.agentKey,
				type: newDevice.type
			}
		})

		return {
			success: true,
			device: newDevice
		}
	} catch (error) {
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'error',
			`createDevice - Error:`,
			error
		)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to create device'
		}
	}
}

export async function getDevices(options?: DeviceFilterOptions) {
	await logAction(
		LoggerService.DEVICE_SERVICE,
		'info',
		'[GET_DEVICES] Fetching devices from database directly (no cache)'
	)
	try {
		const devices = await services.data.device.findAll(options)
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'info',
			'[GET_DEVICES] Результат запроса:',
			{
				count: devices?.length || 0,
				devices: devices || []
			}
		)
		return devices
	} catch (error) {
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'error',
			'[GET_DEVICES] Ошибка при получении устройств:',
			error
		)
		throw error
	}
}

export async function getDevicesStats() {
	return await services.data.device.getDeviceStats()
}

export async function updateDeviceStatus(id: string, status: DeviceStatus) {
	await logAction(
		LoggerService.DEVICE_SERVICE,
		'info',
		'[CACHE_SERVER] updateDeviceStatus - Updating device status:',
		{
			id,
			status
		}
	)
	const updatedDevice = await services.data.device.updateStatus(id, status)
	return updatedDevice
}

export async function updateDeviceIp(agentKey: string) {
	await logAction(
		LoggerService.DEVICE_SERVICE,
		'info',
		'[CACHE_SERVER] updateDeviceIp - Updating device IP for agent:',
		agentKey
	)
	try {
		const device = await services.data.device.findByAgentKey(agentKey)
		if (!device) {
			throw new Error(`Device with agentKey ${agentKey} not found`)
		}
		const scanResults =
			await services.infrastructure.network_scanner.scanNetwork({
				targetAgentKey: agentKey
			})
		if (!scanResults.length) {
			throw new Error(
				`Device with agentKey ${agentKey} not found in network`
			)
		}
		const agent = scanResults[0]

		const updatedDevice = await services.data.device.updateIpAddress(
			device.id,
			agent.ipAddress
		)
		return updatedDevice
	} catch (error) {
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'error',
			'[CACHE_SERVER] updateDeviceIp - Error:',
			error
		)
		throw error
	}
}

export async function deleteDeviceById(id: string) {
	await logAction(
		LoggerService.DEVICE_SERVICE,
		'info',
		'[CACHE_SERVER] deleteDeviceById - Deleting device:',
		id
	)
	try {
		// First get the device to get its IP address
		const device = await services.data.device.findById(id)
		if (!device) {
			await logAction(
				LoggerService.DEVICE_SERVICE,
				'error',
				`[DELETE_DEVICE] Device with ID ${id} not found`
			)
			throw new Error(`Device with ID ${id} not found`)
		}

		await logAction(
			LoggerService.DEVICE_SERVICE,
			'info',
			`[DELETE_DEVICE] Deleting device: ${device.name} (${device.ipAddress})`
		)

		// Remove from Prometheus targets first
		try {
			await services.infrastructure.prometheus.removeDeviceFromMonitoring(
				device.id
			)
			await logAction(
				LoggerService.DEVICE_SERVICE,
				'info',
				`[DELETE_DEVICE] Removed from Prometheus monitoring: ${device.ipAddress}`
			)
		} catch (promError) {
			await logAction(
				LoggerService.DEVICE_SERVICE,
				'error',
				`[DELETE_DEVICE] Failed to remove from Prometheus:`,
				promError
			)
			// Continue with deletion even if Prometheus removal fails
		}

		// Then delete from database
		const deletedDevice = await services.data.device.deleteDevice(id)
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'info',
			`[DELETE_DEVICE] Deleted from database: ${deletedDevice.name}`
		)

		await logAuditEvent({
			type: EventType.DEVICE,
			severity: EventSeverity.HIGH,
			title: 'Удалено устройство',
			message: `Устройство "${device.name}" (${device.ipAddress}) удалено из системы.`,
			deviceId: deletedDevice.id,
			metadata: {
				ipAddress: device.ipAddress,
				agentKey: device.agentKey,
				type: device.type,
				status: device.status
			}
		})

		return deletedDevice
	} catch (error) {
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'error',
			'[CACHE_SERVER] deleteDeviceById - Error:',
			error
		)
		throw error
	}
}

export async function updateAllDeviceStatuses(): Promise<number> {
	try {
		// Get all devices
		const devices = await services.data.device.findMany()

		if (!devices.length) return 0

		// Get all IP addresses
		const ipAddresses = devices.map(device => device.ipAddress)

		// Update statuses in batch using the action
		await getAgentStatuses(ipAddresses)

		return devices.length
	} catch (error) {
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'error',
			'Failed to update device statuses:',
			error
		)
		return 0
	}
}

export async function getDeviceStatus(id: string): Promise<{
	success: boolean
	data?: {
		isOnline: boolean
		lastSeen: Date | null
		status: DeviceStatus
	}
	error?: string
}> {
	await logAction(
		LoggerService.DEVICE_SERVICE,
		'info',
		'[DEVICE_STATUS] Getting status for device:',
		id
	)
	try {
		const status = await services.data.device.getDeviceStatus(id)
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'info',
			'[DEVICE_STATUS] status for device:',
			status
		)
		return {
			success: true,
			data: status
		}
	} catch (error) {
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'error',
			'[DEVICE_STATUS] Error:',
			error
		)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to get device status'
		}
	}
}

export async function updateDepartmentDevices({
	id,
	deviceIds
}: {
	id: string
	deviceIds: string[]
}): Promise<void> {
	try {
		await services.data.device.updateDepartmentDevices(id, deviceIds)
	} catch (error) {
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'error',
			'[UPDATE_DEPARTMENT_DEVICES] Error:',
			error
		)
		throw error
	}
}

/**
 * Подтверждение смены оборудования
 */
export async function confirmHardwareChange(
	deviceId: string,
	password: string
): Promise<{ success: boolean; error?: string }> {
	try {
		// Получаем устройство
		const device = await services.data.device.findById(deviceId)
		if (!device) {
			return { success: false, error: 'Device not found' }
		}

		// Отправляем запрос к агенту
		const result = await services.data.device.confirmHardwareChange(
			device.ipAddress,
			device.agentKey,
			password
		)

		if (result.success) {
			// Обновляем все события Hardware_Change_Detected для этого устройства
			await services.data.event.confirmHardwareChangeEvents(deviceId)
		}

		return result
	} catch (error) {
		console.error('[CONFIRM_HARDWARE_CHANGE_ACTION_ERROR]', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}
	}
}

export async function updateDeviceWarrantyStatus(
	deviceId: string,
	purchaseDate: Date | null,
	warrantyPeriod: number | null,
	userId: string
): Promise<{ success: boolean; device?: Device; error?: string }> {
	try {
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'info',
			`[UPDATE_WARRANTY_STATUS] Updating warranty for device: ${deviceId}`
		)

		const updatedDevice = await services.data.device.updateWarrantyStatus(
			deviceId,
			purchaseDate,
			warrantyPeriod,
			userId
		)

		await logAction(
			LoggerService.DEVICE_SERVICE,
			'info',
			`[UPDATE_WARRANTY_STATUS] Warranty updated for device: ${deviceId}`
		)

		return {
			success: true,
			device: updatedDevice
		}
	} catch (error) {
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'error',
			`[UPDATE_WARRANTY_STATUS] Error updating warranty for device ${deviceId}:`,
			error
		)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to update warranty'
		}
	}
}

export async function updateDeviceWarrantyInfo(
	deviceId: string,
	purchaseDate: Date | null,
	warrantyPeriod: number | null,
	userId: string
): Promise<{ success: boolean; device?: Device; error?: string }> {
	try {
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'info',
			`[UPDATE_WARRANTY_INFO] Updating warranty info for device: ${deviceId}`
		)

		const updatedDevice = await services.data.device.updateWarrantyInfo(
			deviceId,
			purchaseDate,
			warrantyPeriod,
			userId
		)

		await logAction(
			LoggerService.DEVICE_SERVICE,
			'info',
			`[UPDATE_WARRANTY_INFO] Warranty info updated for device: ${deviceId}`
		)

		return {
			success: true,
			device: updatedDevice
		}
	} catch (error) {
		await logAction(
			LoggerService.DEVICE_SERVICE,
			'error',
			`[UPDATE_WARRANTY_INFO] Error updating warranty info for device ${deviceId}:`,
			error
		)
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: 'Failed to update warranty info'
		}
	}
}
