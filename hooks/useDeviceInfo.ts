import { DeviceType } from '@prisma/client'
import { useState } from 'react'

import { createDevice } from '@/app/actions/device'
import { activateDevice, getLicenseStatus } from '@/app/actions/licd.actions'
import { getAgentKeyByIp } from '@/app/actions/network-scanner'
import {
	getAgentStatuses,
	getDeviceInfo
} from '@/app/actions/prometheus.actions'

// Данный хук испоьзуется только для полуения данный в окне сканирования
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

			// 1) Узнаём текущий остаток по лицензии (для UX и предсказуемости)
			const lic = await getLicenseStatus()
			let remaining = lic.success ? lic.data.remaining : null
			if (!lic.success) {
				console.warn(
					'[DEVICE_INFO_HOOK] Licd status unavailable:',
					lic.error
				)
			} else {
				console.log('[DEVICE_INFO_HOOK] License remaining:', remaining)
			}

			// 2) (не обязательно, но полезно) — статусы агентов для логов/диагностики
			console.log('[DEVICE_INFO_HOOK] Getting agent statuses...')
			const statusResults = await getAgentStatuses(ipAddresses).catch(
				(e: any) => {
					console.warn(
						'[DEVICE_INFO_HOOK] getAgentStatuses failed:',
						e
					)
					return { success: false } as any
				}
			)
			console.log('[DEVICE_INFO_HOOK] Agent statuses:', statusResults)

			const errors: { [ip: string]: string } = {}
			let addedCount = 0
			let activatedCount = 0
			const notActivated: string[] = []
			const createdDevices: Array<{
				id: string
				name: string
				ipAddress: string
				agentKey: string
			}> = []

			for (const ipAddress of ipAddresses) {
				console.log(
					`[DEVICE_INFO_HOOK] Processing device ${ipAddress}...`
				)
				try {
					// 2.1) Жёсткая проверка лимита — не создаём записи в БД сверх лимита
					if (remaining !== null && remaining <= 0) {
						errors[ipAddress] = 'license_limit_reached'
						console.warn(
							`[DEVICE_INFO_HOOK] License limit reached, skipping create for ${ipAddress}`
						)
						continue
					}

					// 2.2) Пробуем получить расширенную информацию (не критично)
					let deviceInfo: any = null
					try {
						deviceInfo = await getDeviceInfo(ipAddress)
					} catch (infoError) {
						console.warn(
							`[DEVICE_INFO_HOOK] getDeviceInfo failed for ${ipAddress}:`,
							infoError
						)
					}

					// 2.3) Определяем name и agentKey
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

					// 2.4) Создаём устройство в БД
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
					createdDevices.push({
						id: dev.id,
						name: dev.name,
						ipAddress: dev.ipAddress,
						agentKey: dev.agentKey
					})

					// 2.5) Сразу пытаемся активировать устройство в licd
					const act = await activateDevice({
						deviceId: dev.id,
						agentKey: dev.agentKey,
						ipAddress: dev.ipAddress
					})

					if (act.success) {
						activatedCount++
						if (remaining !== null)
							remaining = Math.max(0, remaining - 1)
					} else {
						notActivated.push(ipAddress)
						// Чётко отображаем основную причину
						if (act.reason === 'limit_reached') {
							errors[ipAddress] = 'license_limit_reached'
							// при желании можно break; чтобы не спамить лишними запросами
						} else if (act.reason === 'licd_unreachable') {
							errors[ipAddress] = 'licd_unreachable'
						} else {
							errors[ipAddress] =
								`activation_failed:${act.reason}`
						}
					}
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

			console.log(
				`[DEVICE_INFO_HOOK] Created ${createdDevices.length} devices:`,
				createdDevices.map(d => ({
					id: d.id,
					name: d.name,
					ip: d.ipAddress
				}))
			)

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
		addMultipleDevices
	}
}
