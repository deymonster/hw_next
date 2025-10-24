'use client'

/**
 * Хук `useDepartmentDevices` формирует список устройств выбранных отделов,
 * дополняя их информацией о доступности агента и поддерживая повторную
 * загрузку через React Query.
 */
import { Device } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'

import { getDevices } from '@/app/actions/device'
import { getAgentStatus } from '@/app/actions/prometheus.actions'

interface DeviceOnlineStatus {
	isOnline: boolean
	lastSeen: Date | null
}

interface DeviceWithOnlineStatus extends Device {
	onlineStatus: DeviceOnlineStatus | null
}

export function useDepartmentDevices(options?: { departments?: string[] }) {
	const departments = options?.departments || []
	const hasDepartments = departments.length > 0

	const {
		data: devices,
		isLoading,
		error,
		refetch
	} = useQuery<DeviceWithOnlineStatus[], Error>({
		queryKey: ['department-devices', departments],
		queryFn: async (): Promise<DeviceWithOnlineStatus[]> => {
			// Если departments не указаны, получаем все устройства
			const departmentDevices = await getDevices(
				hasDepartments
					? {
							departmentId:
								departments.length === 1
									? departments[0]
									: undefined,
							...(departments.length > 1 && {
								OR: departments.map(id => ({
									departmentId: id
								}))
							})
						}
					: {}
			)

			if (departmentDevices.length > 0) {
				return Promise.all(
					departmentDevices.map(
						async (device): Promise<DeviceWithOnlineStatus> => {
							const statusResult = await getAgentStatus(
								device.ipAddress
							)
							const agentStatus =
								statusResult.success &&
								statusResult.data &&
								!Array.isArray(statusResult.data)
									? statusResult.data
									: null
							return {
								...device,
								onlineStatus: agentStatus
									? {
											isOnline: agentStatus.up,
											lastSeen: device.lastSeen
										}
									: null
							}
						}
					)
				)
			}

			return []
		},
		enabled: true // Теперь запрос будет выполняться всегда
	})

	return {
		devices,
		isLoading,
		error,
		refetch
	}
}
