'use server'

import { services } from '@/services'
import { NetworkDiscoveredAgent, NetworkScannerOptions } from '@/services/network-scanner/network-scanner.interfaces'

export async function scanNetwork(options?: NetworkScannerOptions): Promise<NetworkDiscoveredAgent[]> {
    return services.infrastructure.network_scanner.scanNetwork(options)
}

export async function findAgentByKey(
    agentKey: string,
    options?: Omit<NetworkScannerOptions, 'targetAgentKey'>
): Promise<string | null> {
    return services.infrastructure.network_scanner.findAgentNewIp(agentKey)
}


export async function getCurrentSubnet(): Promise<string> {
    return services.infrastructure.network_scanner.getCurrentSubnet()
}