'use client'

/**
 * @fileoverview Хук для сбора информации об устройствах для инвентаризации
 * @module useInventoryCollection
 */
import { Device } from '@prisma/client'
import { useCallback, useState } from 'react'

import { getDeviceInfo } from '@/app/actions/inventory.prometheus'

/**
 * Интерфейс результата сбора информации об устройстве
 * @interface DeviceCollectionResult
 */
interface DeviceCollectionResult {
	/** Идентификатор устройства */
	deviceId: string
	/** Статус сбора информации */
	status: 'idle' | 'loading' | 'success' | 'error'
	/** Сообщение об ошибке (если есть) */
	error: string | null
	/** Поле для хранения данных устройства */
	data?: {
		deviceName: string
		ipAddress: string
		processor: string | null
		motherboard: any | null
		memory: any | null
		storage: any | null
		networkCards: any | null
		videoCards: any | null
		diskUsage: any | null
		departmentId: string | null
		employeeId: string | null
		serialNumber: string | null
	}
}

/**
 * Хук для сбора информации об устройствах для инвентаризации
 *
 * @returns {Object} Объект с функциями и состоянием для сбора информации
 */
export function useInventoryCollection() {
	const [collectionResults, setCollectionResults] = useState<
		Record<string, DeviceCollectionResult>
	>({})
	const [isCollecting, setIsCollecting] = useState(false)

	/**
	 * Собирает информацию об одном устройстве
	 *
	 * @param {Device} device - Объект устройства
	 * @returns {Promise<boolean>} Результат операции
	 */
	const collectDeviceInfo = useCallback(async (device: Device) => {
		try {
			// Обновляем статус устройства
			const deviceResult = {
				deviceId: device.id,
				status: 'loading' as const,
				error: null
			}
			setCollectionResults(prev => ({
				...prev,
				[device.id]: deviceResult
			}))

			// Получаем информацию об устройстве через серверный action
			const response = await getDeviceInfo(device.ipAddress)

			if (!response.success || !response.data) {
				const errorResult = {
					deviceId: device.id,
					status: 'error' as const,
					error:
						response.error ||
						'Не удалось получить информацию об устройстве'
				}

				setCollectionResults(prev => ({
					...prev,
					[device.id]: errorResult
				}))

				return { success: false, result: errorResult }
			}

			const { systemInfo, hardwareInfo } = response.data

			// Формируем данные для инвентаризации
			const deviceData = {
				deviceId: device.id,
				deviceName: device.name,
				ipAddress: device.ipAddress,
				processor: hardwareInfo?.cpu?.model || null,
				motherboard: hardwareInfo?.motherboard || null,
				memory: hardwareInfo?.memory || null,
				storage: hardwareInfo?.disks || null,
				networkCards: hardwareInfo?.networkInterfaces || null,
				videoCards: hardwareInfo?.gpus || null,
				diskUsage: null, // У нас нет этой информации из getDeviceInfo
				departmentId: device.departmentId || null,
				employeeId: device.employeeId || null,
				serialNumber: systemInfo?.serialNumber || null
			}

			const successResult = {
				deviceId: device.id,
				status: 'success' as const,
				error: null,
				data: deviceData
			}

			// Обновляем результат
			setCollectionResults(prev => ({
				...prev,
				[device.id]: successResult
			}))

			return { success: true, result: successResult }
		} catch (error) {
			console.error(
				`Ошибка при сборе информации об устройстве ${device.id}:`,
				error
			)

			// Обновляем результат с ошибкой

			const errorResult = {
				deviceId: device.id,
				status: 'error' as const,
				error:
					error instanceof Error
						? error.message
						: 'Неизвестная ошибка'
			}

			setCollectionResults(prev => ({
				...prev,
				[device.id]: errorResult
			}))

			return { success: false, result: errorResult }
		}
	}, [])

	/**
	 * Собирает информацию о нескольких устройствах
	 *
	 * @param {Device[]} devices - Массив устройств
	 * @param {string} inventoryId - Идентификатор инвентаризации
	 * @returns {Promise<boolean>} Результат операции
	 */
	const collectMultipleDevices = useCallback(
		async (devices: Device[], inventoryId: string) => {
			setIsCollecting(true)
			setCollectionResults({})

			try {
				// Инициализируем результаты для всех устройств
				const initialResults: Record<string, DeviceCollectionResult> =
					{}
				devices.forEach(device => {
					initialResults[device.id] = {
						deviceId: device.id,
						status: 'idle',
						error: null
					}
				})
				setCollectionResults(initialResults)

				// Собираем информацию последовательно
				for (const device of devices) {
					await collectDeviceInfo(device)
				}
				return true
			} catch (error) {
				console.error(
					'Ошибка при сборе информации об устройствах:',
					error
				)
				return false
			} finally {
				setIsCollecting(false)
			}
		},
		[collectDeviceInfo]
	)

	return {
		collectDeviceInfo,
		collectMultipleDevices,
		collectionResults,
		isCollecting
	}
}
