import { useCallback, useRef, useState } from 'react'

import {
	cancelScan,
	findAgentByKey,
	getCurrentSubnet,
	scanNetwork
} from '@/app/actions/network-scanner'
import {
	NetworkDiscoveredAgent,
	NetworkScannerOptions
} from '@/services/network-scanner/network-scanner.interfaces'

interface ScannerCallbacks {
	onSuccess?: () => void
	onError?: (error: unknown) => void
}

export function useNetworkScanner() {
	const [isScanning, setIsScanning] = useState(false)
	const [discoveredAgents, setDiscoveredAgents] = useState<
		NetworkDiscoveredAgent[]
	>([])
	const [error, setError] = useState<string | null>(null)
	const abortControllerRef = useRef<AbortController | null>(null)

	const clearResults = useCallback(() => {
		setDiscoveredAgents([])
	}, [])

	const stopScan = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
			abortControllerRef.current = null
			cancelScan()
				.then(() => {
					setIsScanning(false)
					clearResults()
				})
				.catch(err => console.error('Error cancelling scan:', err))
		}
	}, [clearResults])

	const startScan = useCallback(
		async (
			options?: NetworkScannerOptions,
			{ onSuccess, onError }: ScannerCallbacks = {}
		) => {
			try {
				if (abortControllerRef.current) {
					await stopScan()
				}
				clearResults()
				abortControllerRef.current = new AbortController()
				setIsScanning(true)
				setError(null)

				const agents = await scanNetwork({
					...options
				})
				console.log(
					'[NETWORK_SCANNER] Scan completed, received agents:',
					agents
				)
				if (abortControllerRef.current?.signal.aborted) {
					console.log('[NETWORK_SCANNER] Scan was explicitly aborted')
					return []
				}

				// Update state with found agents
				console.log(
					'[NETWORK_SCANNER] Setting discovered agents:',
					agents
				)
				setDiscoveredAgents(agents)
				onSuccess?.()
				return agents
			} catch (error: unknown) {
				if (error instanceof Error && error.name === 'AbortError') {
					console.log('Scanning was aborted')
					return null
				}
				console.error('[NETWORK_SCAN_ERROR]', error)
				setError(
					error instanceof Error
						? error.message
						: 'Failed to scan network'
				)
				onError?.(error)
				return null
			} finally {
				if (abortControllerRef.current) {
					setIsScanning(false)
				}
			}
		},
		[stopScan, clearResults]
	)

	const findAgent = useCallback(
		async (
			agentKey: string,
			options?: Omit<NetworkScannerOptions, 'targetAgentKey'>,
			{ onSuccess, onError }: ScannerCallbacks = {}
		) => {
			try {
				if (abortControllerRef.current) {
					stopScan()
				}
				abortControllerRef.current = new AbortController()
				setIsScanning(true)
				setError(null)

				const newIp = await findAgentByKey(agentKey, {
					...options
				})

				if (!abortControllerRef.current?.signal.aborted) {
					if (newIp) {
						onSuccess?.()
					}
					return newIp
				}
				return null
			} catch (error) {
				if (error instanceof Error && error.message === 'AbortError') {
					console.log('Finding agent was aborted')
					return null
				}
				console.error('[FIND_AGENT_ERROR]', error)
				setError(
					error instanceof Error
						? error.message
						: 'Failed to find agent'
				)
				onError?.(error)
				return null
			} finally {
				if (!abortControllerRef.current?.signal.aborted) {
					setIsScanning(false)
				}
			}
		},
		[stopScan]
	)

	const getSubnet = useCallback(
		async ({ onSuccess, onError }: ScannerCallbacks = {}) => {
			try {
				const subnet = await getCurrentSubnet()
				onSuccess?.()
				return subnet
			} catch (error) {
				console.error('[GET_SUBNET_ERROR]', error)
				setError(
					error instanceof Error
						? error.message
						: 'Failed to get subnet'
				)
				onError?.(error)
				return null
			}
		},
		[]
	)

	const resetScanner = useCallback(() => {
		if (isScanning) {
			stopScan()
		}
		setDiscoveredAgents([])
		setError(null)
	}, [stopScan, isScanning])

	return {
		isScanning,
		discoveredAgents,
		error,
		startScan,
		findAgent,
		getSubnet,
		stopScan,
		resetScanner
	}
}
