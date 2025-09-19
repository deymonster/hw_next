'use client'

import { Device } from '@prisma/client'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import {
	updateDeviceWarrantyInfo,
	updateDeviceWarrantyStatus
} from '@/app/actions/device'
import { useDevicesContext } from '@/contexts/DeviceContext'
import { useAuth } from '@/hooks/useAuth'

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
			purchaseDate: Date | null,
			warrantyPeriod: number | null,
			userId: string
		) => {
			try {
				setIsLoading(true)
				setError(null)

				const result = await updateDeviceWarrantyStatus(
					deviceId,
					purchaseDate,
					warrantyPeriod,
					userId
				)

				// Обновляем локальное состояние
				const updatedDevices = devices.map(device => {
					if (device.id === deviceId) {
						return { ...device, purchaseDate, warrantyPeriod }
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
			purchaseDate: Date | null,
			warrantyPeriod: number | null,
			userId: string
		) => {
			try {
				setIsLoading(true)
				setError(null)

				const promises = deviceIds.map(deviceId =>
					updateDeviceWarrantyStatus(
						deviceId,
						purchaseDate,
						warrantyPeriod,
						userId
					)
				)

				const results = await Promise.allSettled(promises)

				// Обновляем локальное состояние для успешно обновленных устройств
				const updatedDevices = devices.map(device => {
					if (deviceIds.includes(device.id)) {
						return { ...device, purchaseDate, warrantyPeriod }
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

	const { user } = useAuth()
	const queryClient = useQueryClient()
	const updateWarrantyInfo = useCallback(
		async (
			deviceId: string,
			purchaseDate: Date | null,
			warrantyPeriod: number | null
		) => {
			if (!user?.id) return

			setIsLoading(true)
			setError(null)

			try {
				const result = await updateDeviceWarrantyInfo(
					deviceId,
					purchaseDate,
					warrantyPeriod,
					user.id
				)
				if (result.success) {
					// Обновляем кэш устройств
					queryClient.invalidateQueries({ queryKey: ['devices'] })
					return result.device
				} else {
					throw new Error(
						result.error || 'Failed to update warranty info'
					)
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error'
				setError(errorMessage)
				throw error
			} finally {
				setIsLoading(false)
			}
		},
		[user?.id, queryClient]
	)

	// Функция для вычисления статуса гарантии
	const getWarrantyStatus = useCallback((device: Device) => {
		if (!device.purchaseDate || !device.warrantyPeriod) {
			return { isActive: false, endDate: null, daysLeft: null }
		}

		const endDate = new Date(device.purchaseDate)
		endDate.setMonth(endDate.getMonth() + device.warrantyPeriod)

		const now = new Date()
		const daysLeft = Math.ceil(
			(endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
		)

		return {
			isActive: daysLeft > 0,
			endDate,
			daysLeft: daysLeft > 0 ? daysLeft : 0
		}
	}, [])

	return {
		isLoading,
		error,
		updateWarranty,
		getWarrantyMonthsLeft,
		updateMultipleWarranties,
		updateWarrantyInfo,
		getWarrantyStatus
	}
}
