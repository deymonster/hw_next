'use server'

import { services } from '@/services'
import {
	NetworkDiscoveredAgent,
	NetworkScannerOptions
} from '@/services/network-scanner/network-scanner.interfaces'

export async function scanNetwork(
	options?: NetworkScannerOptions
): Promise<NetworkDiscoveredAgent[]> {
	try {
		const result =
			await services.infrastructure.network_scanner.scanNetwork(options)
		console.log(
			'[NETWORK_SCAN_ACTION] Scan completed with results:',
			JSON.stringify(result),
			'Length:',
			result?.length || 0
		)
		return result
	} catch (error) {
		if (error instanceof Error && error.message === 'AbortError') {
			throw new Error('AbortError')
		}
		throw error
	}
}

export async function findAgentByKey(
	agentKey: string,
	options?: Omit<NetworkScannerOptions, 'targetAgentKey'>
): Promise<string | null> {
	return services.infrastructure.network_scanner.findAgentNewIp(
		agentKey,
		options
	)
}

export async function getCurrentSubnet(): Promise<string> {
	return services.infrastructure.network_scanner.getCurrentSubnet()
}

export async function getAgentKeyByIp(
	ipAddress: string
): Promise<string | null> {
	try {
		const agent =
			await services.infrastructure.network_scanner.checkAndGetAgent(
				ipAddress,
				{ timeout: 5000, agentPort: 9182 }
			)
		return agent?.agentKey || null
	} catch (error) {
		console.error(
			`[GET_AGENT_KEY] Failed to get agent key for ${ipAddress}:`,
			error
		)
		return null
	}
}

export async function cancelScan(): Promise<void> {
	services.infrastructure.network_scanner.cancelScan()
}
