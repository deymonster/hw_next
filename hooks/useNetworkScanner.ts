/**
 * Хук `useNetworkScanner` инкапсулирует сценарии сканирования сети,
 * предоставляя функции запуска, остановки и поиска агентов, а также
 * управляя состояниями загрузки и ошибок процесса.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import {
	NetworkDiscoveredAgent,
	NetworkScannerOptions
} from '@/services/network-scanner/network-scanner.interfaces'

interface ScannerCallbacks {
	onSuccess?: () => void
	onError?: (error: unknown) => void
}

type CompletionHandlers = {
	resolve: (value: NetworkDiscoveredAgent[] | null) => void
	reject: (reason?: unknown) => void
}

interface JobEventPayload {
	status?: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
	progress?: number
	result?: NetworkDiscoveredAgent[]
	error?: string | null
}

export function useNetworkScanner() {
	const [isScanning, setIsScanning] = useState(false)
	const [discoveredAgents, setDiscoveredAgents] = useState<
		NetworkDiscoveredAgent[]
	>([])
	const [error, setError] = useState<string | null>(null)
	const [progress, setProgress] = useState(0)
	const [scanId, setScanId] = useState<string | null>(null)
	const scanIdRef = useRef<string | null>(null)
	const eventSourceRef = useRef<EventSource | null>(null)
	const completionRef = useRef<CompletionHandlers | null>(null)

	const closeStream = useCallback(() => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close()
			eventSourceRef.current = null
		}
	}, [])

	const finalizeJob = useCallback(
		(payload: JobEventPayload) => {
			const status = payload.status
			if (!status) return

			if (status === 'COMPLETED') {
				const completedResult = Array.isArray(payload.result)
					? payload.result
					: []
				completionRef.current?.resolve(completedResult)
				if (Array.isArray(payload.result)) {
					setDiscoveredAgents(payload.result)
				}
			}

			if (status === 'FAILED') {
				completionRef.current?.reject(
					new Error(payload.error || 'Scan failed')
				)
			}

			if (status === 'CANCELLED') {
				completionRef.current?.resolve(null)
			}

			if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
				setIsScanning(false)
				closeStream()
				completionRef.current = null
			}
		},
		[closeStream]
	)

	const handleEventPayload = useCallback(
		(payload: JobEventPayload) => {
			if (typeof payload.progress === 'number') {
				setProgress(payload.progress)
			}

			if (Array.isArray(payload.result)) {
				setDiscoveredAgents(payload.result)
			}

			if (payload.status) {
				setIsScanning(
					payload.status === 'RUNNING' || payload.status === 'QUEUED'
				)
				finalizeJob(payload)
			}

			if (payload.error) {
				setError(payload.error)
			}
		},
		[finalizeJob]
	)

	const connectToStream = useCallback(
		(id: string) => {
			closeStream()
			const eventSource = new EventSource(`/api/network/scan/${id}`)
			eventSourceRef.current = eventSource

			eventSource.onmessage = event => {
				try {
					const data = JSON.parse(event.data) as JobEventPayload
					handleEventPayload(data)
				} catch (err) {
					console.error('Failed to parse scan event', err)
				}
			}

			eventSource.onerror = () => {
				eventSource.close()
				setTimeout(() => {
					if (scanIdRef.current === id) {
						connectToStream(id)
					}
				}, 1500)
			}
		},
		[closeStream, handleEventPayload]
	)

	const startScan = useCallback(
		async (
			options?: NetworkScannerOptions,
			{ onSuccess, onError }: ScannerCallbacks = {}
		): Promise<NetworkDiscoveredAgent[] | null> => {
			try {
				closeStream()
				completionRef.current = null
				setIsScanning(true)
				setError(null)
				setProgress(0)
				setDiscoveredAgents([])

				const completionPromise = new Promise<
					NetworkDiscoveredAgent[] | null
				>((resolve, reject) => {
					completionRef.current = { resolve, reject }
				})

				const response = await fetch('/api/network/scan', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(options || {})
				})

				if (!response.ok) {
					const message =
						(await response.json().catch(() => null))?.error ||
						'Failed to start scan'
					setError(message)
					setIsScanning(false)
					const completion =
						completionRef.current as CompletionHandlers | null
					if (completion) {
						completion.reject(message)
						completionRef.current = null
					}
					onError?.(new Error(message))
					return null
				}

				const payload = await response.json()
				setScanId(payload.scanId)
				scanIdRef.current = payload.scanId
				connectToStream(payload.scanId)
				onSuccess?.()
				return completionPromise
			} catch (err) {
				console.error('[NETWORK_SCAN_ERROR]', err)
				setError(
					err instanceof Error
						? err.message
						: 'Failed to scan network'
				)
				setIsScanning(false)
				const completion =
					completionRef.current as CompletionHandlers | null
				if (completion) {
					completion.reject(err)
					completionRef.current = null
				}
				onError?.(err)
				return null
			}
		},
		[connectToStream]
	)

	const resumeScan = useCallback(
		async (id: string): Promise<NetworkDiscoveredAgent[] | null> => {
			try {
				closeStream()
				completionRef.current = null
				const response = await fetch(`/api/network/scan/${id}`)
				if (!response.ok) {
					return null
				}
				const payload = (await response.json()) as JobEventPayload & {
					scanId?: string
				}
				setScanId(id)
				scanIdRef.current = id
				setProgress(payload.progress ?? 0)
				if (Array.isArray(payload.result)) {
					setDiscoveredAgents(payload.result)
				}

				if (
					payload.status === 'COMPLETED' ||
					payload.status === 'FAILED' ||
					payload.status === 'CANCELLED'
				) {
					finalizeJob(payload)
					return payload.result ?? null
				}

				setIsScanning(true)
				const completionPromise = new Promise<
					NetworkDiscoveredAgent[] | null
				>((resolve, reject) => {
					completionRef.current = { resolve, reject }
				})

				connectToStream(id)
				return completionPromise
			} catch (err) {
				console.error('Failed to resume scan', err)
				return null
			}
		},
		[connectToStream, finalizeJob]
	)

	const findAgent = useCallback(
		async (
			agentKey: string,
			options?: Omit<NetworkScannerOptions, 'targetAgentKey'>,
			{ onSuccess, onError }: ScannerCallbacks = {}
		) => {
			const result = await startScan(
				{ ...options, targetAgentKey: agentKey },
				{ onSuccess, onError }
			)
			if (Array.isArray(result)) {
				const target = result.find(agent => agent.agentKey === agentKey)
				return target?.ipAddress || null
			}
			return null
		},
		[startScan]
	)

	const getSubnet = useCallback(
		async ({ onSuccess, onError }: ScannerCallbacks = {}) => {
			try {
				const response = await fetch('/api/network/scan')
				if (!response.ok) {
					throw new Error('Failed to fetch subnet')
				}
				const data = await response.json()
				onSuccess?.()
				return data.subnet as string
			} catch (err) {
				console.error('[GET_SUBNET_ERROR]', err)
				setError(
					err instanceof Error ? err.message : 'Failed to get subnet'
				)
				onError?.(err)
				return null
			}
		},
		[]
	)

	const stopScan = useCallback(async () => {
		if (!scanId) return
		try {
			await fetch(`/api/network/scan/${scanId}`, { method: 'DELETE' })
		} finally {
			setIsScanning(false)
			closeStream()
			completionRef.current?.resolve(null)
			completionRef.current = null
			setScanId(null)
			scanIdRef.current = null
		}
	}, [closeStream, scanId])

	const resetScanner = useCallback(() => {
		closeStream()
		setDiscoveredAgents([])
		setError(null)
		setProgress(0)
		setScanId(null)
		scanIdRef.current = null
		setIsScanning(false)
		completionRef.current = null
	}, [closeStream])

	useEffect(() => () => closeStream(), [closeStream])

	return {
		isScanning,
		discoveredAgents,
		error,
		progress,
		scanId,
		startScan,
		resumeScan,
		findAgent,
		getSubnet,
		stopScan,
		resetScanner
	}
}
