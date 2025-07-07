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

export async function findAgentByKey(agentKey: string): Promise<string | null> {
	return services.infrastructure.network_scanner.findAgentNewIp(agentKey)
}

export async function getCurrentSubnet(): Promise<string> {
	return services.infrastructure.network_scanner.getCurrentSubnet()
}

export async function cancelScan(): Promise<void> {
	services.infrastructure.network_scanner.cancelScan()
}
