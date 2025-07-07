'use client'

import { Device, DeviceStatus, DeviceType } from '@prisma/client'
import { useCallback, useState } from 'react'

import {
	createDevice,
	deleteDeviceById,
	getDevices,
	getDevicesStats,
	updateDeviceIp,
	updateDeviceStatus
} from '@/app/actions/device'
import { useDevicesContext } from '@/contexts/DeviceContext'
import {
	DeviceFilterOptions,
	IDeviceCreateInput
} from '@/services/device/device.interfaces'

interface UseDevicesOptions {
	onSuccess?: () => void
	onError?: (error: Error) => void
}

export function useDevices(options?: UseDevicesOptions) {
	const { devices, setDevices, isLoading, setIsLoading } = useDevicesContext()

	const [stats, setStats] = useState<{
		total: number
		byStatus: Record<DeviceStatus, number>
		byType: Record<DeviceType, number>
	}>()

	const [error, setError] = useState<string | null>(null)

	const fetchDevices = useCallback(
		async (filters?: DeviceFilterOptions) => {
			console.log('[CLIENT] useDevices - Fetching devices...')
			try {
				setIsLoading(true)
				setError(null)
				const result = await getDevices(filters)
				console.log(
					'[CLIENT] useDevices - Devices fetched:',
					result?.length
				)
				setDevices(result || [])
				return result
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to fetch devices'
				console.error(
					'[CLIENT] useDevices - Error fetching devices:',
					message
				)
				setError(message)
				options?.onError?.(error as Error)
				return []
			} finally {
				setIsLoading(false)
			}
		},
		[options, setDevices, setIsLoading]
	)

	const forceRefreshDevices = useCallback(async () => {
		console.log('[CLIENT] useDevices - Force refreshing devices...')
		try {
			// Получаем свежие данные напрямую из БД
			console.log('[CLIENT] useDevices - Fetching fresh data...')
			const freshDevices = await getDevices({})
			console.log(
				`[CLIENT] useDevices - Received ${freshDevices?.length || 0} devices from server`
			)

			// Обновляем состояние в контексте
			setDevices(freshDevices || [])
			console.log('[CLIENT] useDevices - Force refresh completed')

			return freshDevices
		} catch (error) {
			console.error('[CLIENT] useDevices - Force refresh failed:', error)
			return []
		}
	}, [setDevices])

	const addNewDevice = useCallback(
		async (data: IDeviceCreateInput) => {
			try {
				console.log(
					'[CACHE] useDevices - Adding new device:',
					data.name
				)
				setIsLoading(true)
				const result = await createDevice(data)
				console.log(
					'[CACHE] useDevices - Device created, refreshing device list...'
				)
				await fetchDevices()
				console.log(
					'[CACHE] useDevices - Device list refreshed after adding new device'
				)
				if (options?.onSuccess) {
					options.onSuccess()
				}
				return result
			} catch (error) {
				console.error(
					'[CACHE] useDevices - Error adding new device:',
					error
				)
				options?.onError?.(error as Error)
				return null
			} finally {
				setIsLoading(false)
			}
		},
		[options, fetchDevices, setIsLoading]
	)

	const fetchStats = useCallback(async () => {
		try {
			setIsLoading(true)
			const result = await getDevicesStats()
			setStats(result)
			if (options?.onSuccess) {
				options.onSuccess()
			}
			return result
		} catch (error) {
			options?.onError?.(error as Error)
			return null
		} finally {
			setIsLoading(false)
		}
	}, [options, setIsLoading])

	const updateStatus = useCallback(
		async (id: string, status: DeviceStatus) => {
			try {
				setIsLoading(true)
				const result = await updateDeviceStatus(id, status)

				const updatedDevices = devices.map(device => {
					if (device.id === id) {
						return result
					}
					return device
				})
				setDevices(updatedDevices)
				if (options?.onSuccess) {
					options.onSuccess()
				}
				return result
			} catch (error) {
				options?.onError?.(error as Error)
				return null
			} finally {
				setIsLoading(false)
			}
		},
		[options, devices, setDevices, setIsLoading]
	)

	const updateIp = useCallback(
		async (agentKey: string) => {
			try {
				setIsLoading(true)
				const result = await updateDeviceIp(agentKey)

				if (result) {
					const updatedDevices = devices.map(device => {
						if (device.id === result.id) {
							return result
						}
						return device
					})
					setDevices(updatedDevices)
				}

				console.log('Update IP result:', result)
				if (options?.onSuccess) {
					options.onSuccess()
				}
				return result
			} catch (error) {
				options?.onError?.(error as Error)
				return null
			} finally {
				setIsLoading(false)
			}
		},
		[options, devices, setDevices, setIsLoading]
	)

	const deleteDevice = useCallback(
		async (id: string) => {
			try {
				setIsLoading(true)
				console.log('[CLIENT] useDevices - Deleting device:', id)

				// Удаляем устройство из БД
				await deleteDeviceById(id)
				console.log('[CLIENT] useDevices - Device deleted')

				if (options?.onSuccess) {
					options.onSuccess()
				}
				return true
			} catch (error) {
				console.error(
					'[CLIENT] useDevices - Error deleting device:',
					error
				)
				options?.onError?.(error as Error)
				return false
			} finally {
				setIsLoading(false)
			}
		},
		[options, setIsLoading]
	)

	return {
		devices,
		stats,
		isLoading,
		error,
		fetchDevices,
		fetchStats,
		updateStatus,
		updateIp,
		addNewDevice,
		deleteDevice,
		forceRefreshDevices
	}
}
