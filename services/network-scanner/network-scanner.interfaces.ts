export interface NetworkDiscoveredAgent {
	ipAddress: string
	agentKey: string
	isRegistered: boolean
}

export interface NetworkScannerOptions {
	subnet?: string
	timeout?: number
	concurrency?: number
	agentPort?: number
	targetAgentKey?: string
	jobId?: string
	enableBackoff?: boolean
	backoffBaseMs?: number
	maxRetries?: number
}

export interface NetworkScanProgressPayload {
	jobId?: string
	processed: number
	total: number
}

export interface NetworkScannerService {
	getCurrentSubnet(): Promise<string>
	scanNetwork(
		options?: NetworkScannerOptions,
		progressCallback?: (
			payload: NetworkScanProgressPayload
		) => void | Promise<void>
	): Promise<NetworkDiscoveredAgent[]>
	checkAgent(ipAddress: string): Promise<boolean>
}
