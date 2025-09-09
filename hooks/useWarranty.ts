'use client'

import { useCallback, useState } from 'react'

import { updateDeviceWarrantyStatus } from '@/app/actions/device'
import { useDevicesContext } from '@/contexts/DeviceContext'

interface UseWarrantyOptions {
	onSuccess?: () => void
	onError?: (error: Error) => void
}

export function useWarranty(options?: UseWarrantyOptions) {
	const { devices, setDevices } = useDevicesContext()
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const updateWarranty = useCallback(
		async (
			deviceId: string,
			warrantyExpiresAt: Date | null,
			userId: string
		) => {
			try {
				setIsLoading(true)
				setError(null)

				const result = await updateDeviceWarrantyStatus(
					deviceId,
					warrantyExpiresAt,
					userId
				)

				// Обновляем локальное состояние
				const updatedDevices = devices.map(device => {
					if (device.id === deviceId) {
						return { ...device, warrantyStatus: warrantyExpiresAt }
					}
					return device
				})
				setDevices(updatedDevices)

				options?.onSuccess?.()
				return result
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to update warranty'
				setError(message)
				options?.onError?.(error as Error)
				return null
			} finally {
				setIsLoading(false)
			}
		},
		[devices, setDevices, options]
	)

	// Функция для вычисления остатка гарантии в месяцах
	const getWarrantyMonthsLeft = useCallback(
		(warrantyExpiresAt: string | null): number | null => {
			if (!warrantyExpiresAt) return null

			const expiryDate = new Date(warrantyExpiresAt)
			const now = new Date()

			if (expiryDate <= now) return 0

			const diffTime = expiryDate.getTime() - now.getTime()
			const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30))

			return diffMonths
		},
		[]
	)

	// Массовое обновление гарантии
	const updateMultipleWarranties = useCallback(
		async (
			deviceIds: string[],
			warrantyExpiresAt: Date | null,
			userId: string
		) => {
			try {
				setIsLoading(true)
				setError(null)

				const promises = deviceIds.map(deviceId =>
					updateDeviceWarrantyStatus(
						deviceId,
						warrantyExpiresAt,
						userId
					)
				)

				const results = await Promise.allSettled(promises)

				// Обновляем локальное состояние для успешно обновленных устройств
				const updatedDevices = devices.map(device => {
					if (deviceIds.includes(device.id)) {
						return { ...device, warrantyStatus: warrantyExpiresAt }
					}
					return device
				})
				setDevices(updatedDevices)

				// Проверяем на ошибки
				const failures = results.filter(
					result => result.status === 'rejected'
				)
				if (failures.length > 0) {
					throw new Error(
						`Failed to update ${failures.length} devices`
					)
				}

				options?.onSuccess?.()
				return results
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to update warranties'
				setError(message)
				options?.onError?.(error as Error)
				return null
			} finally {
				setIsLoading(false)
			}
		},
		[devices, setDevices, options]
	)

	return {
		isLoading,
		error,
		updateWarranty,
		getWarrantyMonthsLeft,
		updateMultipleWarranties
	}
}
