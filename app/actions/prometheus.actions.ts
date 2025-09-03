'use server'

import { services } from '@/services'
import { AgentStatus } from '@/services/prometheus/prometheus.interfaces'

const prometheus = services.infrastructure.prometheus
const deviceService = services.data.device

export async function getDeviceInfo(ipAddress: string) {
	try {
		const [systemInfo, hardwareInfo] = await Promise.all([
			prometheus.getSystemInfo(ipAddress),
			prometheus.getHardwareInfo(ipAddress)
		])
		return {
			success: true,
			data: {
				systemInfo: systemInfo,
				hardwareInfo: hardwareInfo
			}
		}
	} catch (error) {
		console.error('Failed to get agent info:', error)
		return {
			success: false,
			error: 'Failed to get agent information'
		}
	}
}

export async function getAgentStatuses(ipAddresses: string[]): Promise<{
	success: boolean
	data?: { [ip: string]: AgentStatus }
	error?: string
}> {
	try {
		const results: { [ip: string]: AgentStatus } = {}

		// Получаем статусы всех агентов параллельно
		const statusPromises = ipAddresses.map(async ip => {
			try {
				const status = await prometheus.getAgentStatus(ip)
				if (!Array.isArray(status)) {
					results[ip] = status

					// Обновляем статус в БД, если устройство существует
					try {
						const device = await deviceService.findByIpAddress(ip)
						if (device) {
							await deviceService.updateStatus(
								device.id,
								status.up ? 'ACTIVE' : 'INACTIVE'
							)

							if (status.up) {
								await deviceService.updateLastSeen(device.id)
							}
						}
					} catch (dbError) {
						console.error(
							`[AGENT_STATUSES_ACTION] Failed to update device status for ${ip}:`,
							dbError
						)
					}
				}
			} catch (error) {
				console.error(
					`[AGENT_STATUSES_ACTION] Failed to get status for ${ip}:`,
					error
				)
				results[ip] = {
					health: 'error',
					lastError: `Failed to get agent status: ${error}`,
					lastScrape: '',
					lastScrapeDuration: 0,
					scrapeInterval: '',
					scrapeTimeout: '',
					up: false
				}
			}
		})

		// Ждем завершения всех запросов
		await Promise.all(statusPromises)

		return {
			success: true,
			data: results
		}
	} catch (error) {
		console.error(
			'[AGENT_STATUSES_ACTION] Failed to get agent statuses:',
			error
		)
		return {
			success: false,
			error: `Failed to get agent statuses: ${error}`
		}
	}
}

export async function getAgentStatus(ipAddress?: string): Promise<{
	success: boolean
	data?: AgentStatus | AgentStatus[]
	error?: string
}> {
	try {
		const status = await prometheus.getAgentStatus(ipAddress as string)

		if (ipAddress && !Array.isArray(status)) {
			try {
				const device = await deviceService.findByIpAddress(ipAddress)
				if (device) {
					await deviceService.updateStatus(
						device.id,
						status.up ? 'ACTIVE' : 'INACTIVE'
					)

					if (status.up) {
						await deviceService.updateLastSeen(device.id)
					}
				}
			} catch (error) {
				console.error(
					`[AGENT_STATUS_ACTION] Failed to update device status:`,
					error
				)
			}
		}

		return {
			success: true,
			data: status
		}
	} catch (error) {
		console.error(
			'[AGENT_STATUS_ACTION] Failed to get agent status:',
			error
		)
		return {
			success: false,
			error: `Failed to get agent status: ${error}`
		}
	}
}
