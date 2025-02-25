import { DeviceType } from "@prisma/client";

export interface NetworkDiscoveredAgent {
    ipAddress:  string
    agentKey: string
    type: DeviceType
    isRegistered: boolean
    systemInfo?: {
        manufacturer: string
        model: string
        name: string
        osArchitecture: string
        osVersion: string
    }

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
