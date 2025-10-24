/**
 * Хук `useDeviceInfo` управляет сбором сведений об устройствах по IP:
 * получает метрики агента, создаёт записи в базе и активирует оборудование
 * поодиночке или пакетно с учётом лицензий.
 */
import { DeviceType } from '@prisma/client'
import { useState } from 'react'

import { createDevice } from '@/app/actions/device'
import {
	activateBatchDevices,
	activateDevice,
	getLicenseStatus
} from '@/app/actions/licd.actions'
import { getAgentKeyByIp } from '@/app/actions/network-scanner'
import { getDeviceInfo } from '@/app/actions/prometheus.actions'

// Данный хук используется только для получения данных в окне сканирования
export const useDeviceInfo = () => {
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [deviceInfo, setDeviceInfo] = useState<any>(null)

	const getInfo = async (ipAddress: string) => {
		try {
			setIsLoading(true)
			setError(null)

			const result = await getDeviceInfo(ipAddress)

			if (!result.success) {
				throw new Error(result.error)
			}

			setDeviceInfo(result.data)
			console.log('Device Info', result.data)
			return result.data
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to scan device'
			setError(errorMessage)
			console.error('Scanning error:', error)
			return null
		} finally {
			setIsLoading(false)
		}
	}

	// Добавление одного устройства
	const addSingleDevice = async (
		ipAddress: string
	): Promise<{
		success: boolean
		device?: any
		error?: string
		activated?: boolean
	}> => {
		try {
			console.log(
				`[DEVICE_INFO_HOOK] Adding single device ${ipAddress}...`
			)

			// Проверяем лицензию
			const lic = await getLicenseStatus()
			if (lic.success && lic.data.remaining <= 0) {
				return {
					success: false,
					error: 'License limit reached'
				}
			}

			// Получаем информацию об устройстве
			let deviceInfo: any = null
			try {
				deviceInfo = await getDeviceInfo(ipAddress)
			} catch (infoError) {
				console.warn(
					`[DEVICE_INFO_HOOK] getDeviceInfo failed for ${ipAddress}:`,
					infoError
				)
			}

			// Определяем name и agentKey
			let deviceName = `Device-${ipAddress.split('.').pop()}`
			let agentKey: string | null = null

			if (
				deviceInfo?.success &&
				deviceInfo?.data?.systemInfo &&
				deviceInfo?.data?.systemInfo?.name
			) {
				deviceName = deviceInfo.data.systemInfo.name
				agentKey =
					deviceInfo.data.systemInfo.uuid ||
					`temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
			}

			// Если не получили agentKey из метрик — берём напрямую у агента
			if (!agentKey) {
				const k = await getAgentKeyByIp(ipAddress)
				if (!k) {
					return {
						success: false,
						error: 'Failed to get agent key from device'
					}
				}
				agentKey = k
			}

			// Создаём устройство в БД
			const createResult = await createDevice({
				name: deviceName,
				ipAddress,
				agentKey,
				type: DeviceType.WINDOWS
			})

			if (!createResult.success || !createResult.device) {
				return {
					success: false,
					error: 'Failed to add device to database'
				}
			}

			const device = createResult.device

			// Активируем устройство
			const activationResult = await activateDevice({
				deviceId: device.id,
				agentKey: device.agentKey,
				ipAddress: device.ipAddress,
				port: 9182
			})

			return {
				success: true,
				device,
				activated: activationResult.success
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			console.error(
				`[DEVICE_INFO_HOOK] Error adding single device ${ipAddress}:`,
				error
			)
			return {
				success: false,
				error: errorMessage
			}
		}
	}

	// Добавление нескольких устройств (batch)
	const addMultipleDevices = async (
		ipAddresses: string[]
	): Promise<{
		success: boolean
		addedCount: number
		errors: { [ip: string]: string }
		activatedCount?: number
		notActivated?: string[]
	}> => {
		try {
			console.log(
				`[DEVICE_INFO_HOOK] Starting to add ${ipAddresses.length} devices...`
			)

			// Если только одно устройство, используем одиночное добавление
			if (ipAddresses.length === 1) {
				const result = await addSingleDevice(ipAddresses[0])
				return {
					success: result.success,
					addedCount: result.success ? 1 : 0,
					activatedCount: result.activated ? 1 : 0,
					errors: result.success
						? {}
						: { [ipAddresses[0]]: result.error || 'Unknown error' },
					notActivated: result.activated ? [] : [ipAddresses[0]]
				}
			}

			// Для множественного добавления используем batch
			// 1) Узнаём текущий остаток по лицензии
			const lic = await getLicenseStatus()
			let remaining = lic.success ? lic.data.remaining : null
			if (!lic.success) {
				console.warn(
					'[DEVICE_INFO_HOOK] Licd status unavailable:',
					lic.error
				)
			}

			// // 2) Получаем статусы агентов
			// console.log('[DEVICE_INFO_HOOK] Getting agent statuses...')
			// const statusResults = await getAgentStatuses(ipAddresses).catch(
			// 	(e: any) => {
			// 		console.warn(
			// 			'[DEVICE_INFO_HOOK] getAgentStatuses failed:',
			// 			e
			// 		)
			// 		return { success: false } as any
			// 	}
			// )

			const errors: { [ip: string]: string } = {}
			let addedCount = 0
			const notActivated: string[] = []
			const devicesForBatch: Array<{
				deviceId: string
				agentKey: string
				ipAddress: string
				port?: number
			}> = []

			// 3) Создаем устройства в БД и подготавливаем для batch активации
			for (const ipAddress of ipAddresses) {
				console.log(
					`[DEVICE_INFO_HOOK] Processing device ${ipAddress}...`
				)
				try {
					// Проверка лимита
					if (remaining !== null && remaining <= 0) {
						errors[ipAddress] = 'license_limit_reached'
						console.warn(
							`[DEVICE_INFO_HOOK] License limit reached, skipping create for ${ipAddress}`
						)
						continue
					}

					// Получаем информацию об устройстве
					let deviceInfo: any = null
					try {
						deviceInfo = await getDeviceInfo(ipAddress)
					} catch (infoError) {
						console.warn(
							`[DEVICE_INFO_HOOK] getDeviceInfo failed for ${ipAddress}:`,
							infoError
						)
					}

					// Определяем name и agentKey
					let deviceName = `Device-${ipAddress.split('.').pop()}`
					let agentKey: string | null = null

					if (
						deviceInfo?.success &&
						deviceInfo?.data?.systemInfo &&
						deviceInfo?.data?.systemInfo?.name
					) {
						deviceName = deviceInfo.data.systemInfo.name
						agentKey =
							deviceInfo.data.systemInfo.uuid ||
							`temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
					}

					// Если не получили agentKey из метрик — берём напрямую у агента
					if (!agentKey) {
						const k = await getAgentKeyByIp(ipAddress)
						if (!k) {
							errors[ipAddress] =
								'Failed to get agent key from device'
							continue
						}
						agentKey = k
					}

					// Создаём устройство в БД
					const createResult = await createDevice({
						name: deviceName,
						ipAddress,
						agentKey,
						type: DeviceType.WINDOWS
					})

					if (!createResult.success || !createResult.device) {
						errors[ipAddress] = 'Failed to add device to database'
						continue
					}

					addedCount++
					const dev = createResult.device

					// Добавляем в список для batch активации
					devicesForBatch.push({
						deviceId: dev.id,
						agentKey: dev.agentKey,
						ipAddress: dev.ipAddress,
						port: 9182
					})

					if (remaining !== null) remaining--
				} catch (err) {
					const msg =
						err instanceof Error ? err.message : 'Unknown error'
					errors[ipAddress] = msg
					console.error(
						`[DEVICE_INFO_HOOK] Error processing device ${ipAddress}:`,
						err
					)
				}
			}

			// 4) Batch активация всех созданных устройств
			let activatedCount = 0
			if (devicesForBatch.length > 0) {
				console.log(
					`[DEVICE_INFO_HOOK] Starting batch activation for ${devicesForBatch.length} devices...`
				)

				const batchResult = await activateBatchDevices({
					devices: devicesForBatch
				})

				if (batchResult.success) {
					activatedCount = batchResult.successCount
					console.log(
						`[DEVICE_INFO_HOOK] Batch activation completed: ${activatedCount}/${devicesForBatch.length} devices activated`
					)

					// Обрабатываем результаты
					for (const result of batchResult.results) {
						if (!result.success) {
							const key = result.ipAddress ?? result.deviceId
							notActivated.push(key)
							errors[key] = result.error || 'activation_failed'
						}
					}
				} else {
					console.error(
						'[DEVICE_INFO_HOOK] Batch activation failed:',
						batchResult.reason
					)
					// Все устройства не активированы
					for (const device of devicesForBatch) {
						notActivated.push(device.ipAddress)
						errors[device.ipAddress] =
							batchResult.reason || 'batch_activation_failed'
					}
				}
			}

			return {
				success: addedCount > 0,
				addedCount,
				activatedCount,
				notActivated,
				errors
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			console.error(
				'[DEVICE_INFO_HOOK] Failed to add multiple devices:',
				error
			)
			return {
				success: false,
				addedCount: 0,
				errors: { general: errorMessage }
			}
		}
	}

	return {
		getInfo,
		isLoading,
		error,
		deviceInfo,
		addSingleDevice,
		addMultipleDevices
	}
}
