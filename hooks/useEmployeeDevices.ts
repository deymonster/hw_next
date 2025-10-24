'use client'

/**
 * Хук `useEmployeeDevices` загружает список устройств, закреплённых за
 * сотрудником, и дополняет их текущим статусом, используя React Query
 * для кеширования и повторного запроса данных.
 */
import { useQuery } from '@tanstack/react-query'

import { getDevices, getDeviceStatus } from '@/app/actions/device'

export function useEmployeeDevices() {
	const {
		data: devices,
		isLoading,
		error,
		refetch
	} = useQuery({
		queryKey: ['employee-devices'],
		queryFn: async () => {
			const devices = await getDevices()

			if (devices && devices.length > 0) {
				const devicesWithStatus = await Promise.all(
					devices.map(async device => {
						const statusResult = await getDeviceStatus(device.id)
						return {
							...device,
							status: statusResult.success
								? statusResult.data
								: null
						}
					})
				)
				return devicesWithStatus
			}

			return devices
		}
	})

	return {
		devices,
		isLoading,
		error,
		refetch
	}
}
