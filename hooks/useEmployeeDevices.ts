'use client'

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
