

export interface NetworkDiscoveredAgent {
    ipAddress:  string
    agentKey: string
    isRegistered: boolean
}

export interface NetworkScannerOptions {
    subnet?: string
    timeout?: number
    concurrency?: number
    agentPort?: number
    targetAgentKey?: string
}

export interface NetworkScannerService {
    getCurrentSubnet(): Promise<string>
    scanNetwork(options?: NetworkScannerOptions): Promise<NetworkDiscoveredAgent[]>
    checkAgent(ipAddress: string): Promise<boolean>
}
