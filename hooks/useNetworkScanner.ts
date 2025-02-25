import { useCallback, useState } from 'react'
import { NetworkDiscoveredAgent, NetworkScannerOptions } from '@/services/network-scanner/network-scanner.interfaces'
import { scanNetwork, findAgentByKey, getCurrentSubnet } from '@/app/actions/network-scanner'
import { services } from '@/services'


interface ScannerCallbacks {
    onSuccess?: () => void
    onError?: (error: unknown) => void
}

export function useNetworkScanner() {
    const [isScanning, setIsScanning] = useState(false)
    const [discoveredAgents, setDiscoveredAgents] = useState<NetworkDiscoveredAgent[]>([])
    const [error, setError] = useState<string | null>(null)

    const startScan = useCallback(async (
        options?: NetworkScannerOptions,
        { onSuccess, onError }: ScannerCallbacks = {}
    ) => {
        try {
            setIsScanning(true)
            setError(null)
            const agents = await scanNetwork(options)
            setDiscoveredAgents(agents)
            onSuccess?.()
            return agents
        } catch(error) {
            console.error('[NETWORK_SCAN_ERROR]', error)
            setError(error instanceof Error ? error.message : 'Failed to scan network')
            onError?.(error)
            return null
        } finally {
            setIsScanning(false)
        }
    }, [])


    const findAgent = useCallback(async(
        agentKey: string,
        options?: Omit<NetworkScannerOptions, 'targetAgentKey'>,
        { onSuccess, onError }: ScannerCallbacks = {}
    ) => {
        try{
            setIsScanning(true)
            setError(null)
            const newIp = await findAgentByKey(agentKey, options)
            if (newIp) {
                onSuccess?.()
            }
            return newIp
        } catch (error) {
            console.error('[FIND_AGENT_ERROR]', error)
            setError(error instanceof Error ? error.message : 'Failed to find agent')
            onError?.(error)
            return null
        } finally {
            setIsScanning(false)
        }
    }, [])

    const getSubnet = useCallback(async (
        { onSuccess, onError }: ScannerCallbacks = {}
    ) => {
        try {
            const subnet = await getCurrentSubnet()
            onSuccess?.()
            return subnet
        } catch (error) {
            console.error('[GET_SUBNET_ERROR]', error)
            setError(error instanceof Error ? error.message : 'Failed to get subnet')
            onError?.(error)
            return null
        }
    }, [])

    return {
        isScanning,
        discoveredAgents,
        error,
        startScan,
        findAgent,
        getSubnet
    }
}