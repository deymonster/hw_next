import axios from 'axios'
import { networkInterfaces } from 'os'

import { IServices } from '../types'
import {
        NetworkDiscoveredAgent,
        NetworkScannerOptions
} from './network-scanner.interfaces'

export class NetworkScannerService {
        private readonly defaultOptions: NetworkScannerOptions = {
                timeout: Number(process.env.NETWORK_SCANNER_TIMEOUT_MS) || 5000,
                concurrency: Number(process.env.NETWORK_SCANNER_CONCURRENCY) || 25,
                agentPort: Number(process.env.AGENT_PORT) || 9182,
                enableBackoff:
                        (process.env.NETWORK_SCANNER_BACKOFF_ENABLED || 'false') === 'true',
                backoffBaseMs: Number(process.env.NETWORK_SCANNER_BACKOFF_BASE_MS) || 200,
                maxRetries: Number(process.env.NETWORK_SCANNER_MAX_RETRIES) || 3
        }
        private readonly cacheTtlSeconds =
                Number(process.env.NETWORK_SCANNER_CACHE_TTL_SECONDS) || 600
        private readonly cacheKeyPrefix = 'network_scanner:agent_ip:'
        private services?: IServices
        private redis?: typeof import('ioredis').default

        private isCancelled = false

        constructor() {
                if (typeof window === 'undefined') {
                        try {
                                // Lazy import to avoid issues in environments without Redis
                                // eslint-disable-next-line @typescript-eslint/no-var-requires
                                const redisClient = require('../redis/client').default
                                this.redis = redisClient
                        } catch (error) {
                                console.warn(
                                        '[SCAN_NETWORK] Redis client unavailable, falling back to in-memory cache',
                                        error
                                )
                        }
                }
        }

        initialize(services: IServices) {
                this.services = services
        }

	async getCurrentSubnet(): Promise<string> {
		// В production используем переменную окружения или определяем по серверному IP
		if (
			process.env.NODE_ENV === 'production' &&
			process.env.NEXT_PUBLIC_SERVER_IP
		) {
			const serverIp = process.env.NEXT_PUBLIC_SERVER_IP
			const parts = serverIp.split('.')
			if (parts.length === 4) {
				return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
			}
		}

		// Fallback для development или если переменная не задана
		const interfaces = networkInterfaces()
		for (const [, addrs] of Object.entries(interfaces)) {
			for (const addr of addrs || []) {
				if (addr.family === 'IPv4' && !addr.internal) {
					const parts = addr.address.split('.')
					return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
				}
			}
		}
		throw new Error('No active network interfaces found')
	}

	async scanNetwork(
		options?: NetworkScannerOptions,
		progressCallback?: (payload: {
			jobId?: string
			processed: number
			total: number
		}) => void
	): Promise<NetworkDiscoveredAgent[]> {
		console.log(
			`[SCAN_NETWORK] [${options?.jobId || options?.targetAgentKey || 'job'}] Starting network scan...`
		)
		this.isCancelled = false
		const opts = { ...this.defaultOptions, ...options }
                const subnet = options?.subnet || (await this.getCurrentSubnet())

                const baseIp = subnet.split('/')[0]
                const agents: NetworkDiscoveredAgent[] = []

                const cachedTargetIp = options?.targetAgentKey
                        ? await this.getCachedIp(options.targetAgentKey)
                        : null

                const ips = Array.from({ length: 254 }, (_, i) =>
                        baseIp.replace(/\.0$/, `.${i + 1}`)
                )

                const uniqueIps = new Set<string>(cachedTargetIp ? [cachedTargetIp] : [])
                ips.forEach(ip => uniqueIps.add(ip))

                const aliveIps = await this.filterAliveIps(
                        Array.from(uniqueIps),
                        opts.timeout!,
                        opts.concurrency!
                )

                let processed = 0
                const total = Math.max(aliveIps.length, 1)

                if (aliveIps.length === 0) {
                        await progressCallback?.({
                                jobId: opts.jobId || opts.targetAgentKey,
                                processed,
                                total
                        })
                        return agents
                }

                if (cachedTargetIp && !aliveIps.includes(cachedTargetIp)) {
                        console.log(
                                `[SCAN_NETWORK] Cached IP ${cachedTargetIp} for ${options?.targetAgentKey} is not reachable`
                        )
                }

                // Разбиваем на чанки для параллельного сканирования
                const chunks = this.chunkArray(aliveIps, opts.concurrency!)

                for (const chunk of chunks) {
                        if (this.isCancelled) {
                                console.log('[SCAN_NETWORK] Scan was cancelled')
                                return agents
                        }
                        try {
                                const promises = chunk.map(ip =>
                                        this.checkAndGetAgent(ip, opts)
                                )
				const results = await Promise.all(promises)
                                const foundAgents = results.filter(
                                        Boolean
                                ) as NetworkDiscoveredAgent[]

                                if (foundAgents.length > 0) {
                                        console.log(
                                                `[SCAN_NETWORK] Found ${foundAgents.length} agents in current chunk:`
                                        )
                                        foundAgents.forEach(agent => {
                                                console.log(
                                                        `[SCAN_NETWORK] Found agent: IP=${agent.ipAddress}, AgentKey=${agent.agentKey}, Registered=${agent.isRegistered}`
                                                )
                                        })
                                }
				// Если ищем конкретного агента и нашли его - сразу возвращаем
				if (opts.targetAgentKey) {
					const targetAgent = foundAgents.find(
						agent => agent.agentKey === opts.targetAgentKey
					)
					if (targetAgent) {
						console.log(
							`[SCAN_NETWORK] [${opts.jobId || opts.targetAgentKey}] Found target agent:`,
							targetAgent
						)
						processed += chunk.length
						await progressCallback?.({
							jobId: opts.jobId || opts.targetAgentKey,
							processed,
							total
						})
						return [targetAgent]
					}
				}

				agents.push(...foundAgents)
                                processed += chunk.length
                                await progressCallback?.({
                                        jobId: opts.jobId || opts.targetAgentKey,
                                        processed,
                                        total
                                })
                        } catch (error) {
                                if (error instanceof Error && error.message === 'AbortError') {
                                        throw error
                                }
                        }
                }

                return agents
        }

	cancelScan(): void {
		this.isCancelled = true
		console.log('[SCAN_NETWORK] Cancelling network scan...')
	}

	async findAgentNewIp(
		targetAgentKey: string,
		options?: Omit<NetworkScannerOptions, 'targetAgentKey'>
	): Promise<string | null> {
		const agents = await this.scanNetwork({ ...options, targetAgentKey })
		return agents.length > 0 ? agents[0].ipAddress : null
	}

	async checkAgent(ipAddress: string): Promise<boolean> {
		const agent = await this.checkAndGetAgent(
			ipAddress,
			this.defaultOptions
		)
		return agent !== null
	}

        async checkAndGetAgent(
                ip: string,
                options: NetworkScannerOptions
        ): Promise<NetworkDiscoveredAgent | null> {
                try {
                        const response = await this.executeWithBackoff(options, () =>
                                axios
                                        .get(`http://${ip}:${options.agentPort}/metrics`, {
                                                timeout: options.timeout,
                                                proxy: false,
                                                headers: {
                                                        'X-Agent-Handshake-Key':
                                                                process.env.AGENT_HANDSHAKE_KEY || 'VERY_SECRET_KEY'
                                                }
                                        })
                                        .catch(error => {
                                                // Детальное логирование ошибки
                                                if (axios.isCancel(error)) {
                                                        throw new Error('AbortError')
                                                }

                                                if (
                                                        error.code !== 'ECONNREFUSED' &&
                                                        error.code !== 'ETIMEDOUT' &&
                                                        error.code !== 'ECONNABORTED'
                                                ) {
                                                        console.log(
                                                                `[CHECK_AGENT] [${ip}] Error type: ${error.code || 'unknown'}`
                                                        )
                                                        console.log(
                                                                `[CHECK_AGENT] [${ip}] Error name:`,
                                                                error.name
                                                        )
                                                        console.log(
                                                                `[CHECK_AGENT] [${ip}] Full error:`,
                                                                error.message
                                                        )
                                                        if (error.response) {
                                                                console.log(
                                                                        `[CHECK_AGENT] [${ip}] Response status:`,
                                                                        error.response.status
                                                                )
                                                                console.log(
                                                                        `[CHECK_AGENT] [${ip}] Response headers:`,
                                                                        error.response.headers
                                                                )
                                                        }
                                                }

                                                throw error // Перебрасываем ошибку дальше
                                        })
                        )

                        if (response.status === 200) {
                                const metrics = response.data as string

				// Получаем UUID системы
				const uuidMatch = metrics.match(
					/UNIQUE_ID_SYSTEM{uuid="([^"]+)"}/
				)
				if (!uuidMatch) {
					return null
				}

				const agentKey = uuidMatch[1]
				if (!this.services) {
					console.error('[CHECK_AGENT] Services not initialized')
					return {
						ipAddress: ip,
						agentKey: agentKey,
						isRegistered: false
					}
				}

				const existingDevice =
					await this.services.data.device.findByAgentKey(agentKey)

                                const agent = {
                                        ipAddress: ip,
                                        agentKey: agentKey,
                                        isRegistered: !!existingDevice
                                }

                                await this.cacheAgentIp(agentKey, ip)

                                console.log(
                                        `[CHECK_AGENT] Successfully discovered agent at ${ip}:`,
                                        {
                                                agentKey: agentKey,
						isRegistered: !!existingDevice
					}
				)

				return agent
			}
		} catch (error) {
			const errorMessage = (error as Error).message
			console.log(`[CHECK_AGENT] Failed checking ${ip}:`, {
				message: errorMessage,
				timestamp: new Date().toISOString()
			})
		}
		return null
	}

        private chunkArray<T>(array: T[], size: number): T[][] {
                const chunks: T[][] = []
                for (let i = 0; i < array.length; i += size) {
                        chunks.push(array.slice(i, i + size))
                }
                return chunks
        }

        private async filterAliveIps(
                ips: string[],
                timeout: number,
                concurrency: number
        ): Promise<string[]> {
                const alive: string[] = []

                if (ips.length === 0) return alive

                const pingModule = await import('net-ping').then(module =>
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ((module as any).default || module) as any
                )

                let arpModule: any = null
                try {
                        arpModule = await import('arpjs').then(module =>
                                (module as any).default || module
                        )
                } catch (error) {
                        console.warn('[SCAN_NETWORK] ARP module unavailable', error)
                }

                const session = pingModule.createSession({ timeout })

                try {
                        const chunks = this.chunkArray(ips, concurrency)
                        for (const chunk of chunks) {
                                const results = await Promise.all(
                                        chunk.map(ip =>
                                                this.isIpAlive(ip, timeout, session, arpModule)
                                        )
                                )

                                results.forEach((isAlive, idx) => {
                                        if (isAlive) alive.push(chunk[idx])
                                })

                                if (this.isCancelled) {
                                        break
                                }
                        }
                } finally {
                        session.close()
                }

                return alive
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private async isIpAlive(ip: string, timeout: number, session: any, arp: any) {
                return await new Promise<boolean>(resolve => {
                        let settled = false

                        const finalize = (result: boolean) => {
                                if (!settled) {
                                        settled = true
                                        resolve(result)
                                }
                        }

                        const timer = setTimeout(() => finalize(false), timeout + 50)

                        session.pingHost(ip, (error: Error | null) => {
                                if (!error) {
                                        clearTimeout(timer)
                                        finalize(true)
                                        return
                                }

                                if (arp && typeof arp.getMAC === 'function') {
                                        arp.getMAC(ip, (arpError: Error | null, mac: string) => {
                                                clearTimeout(timer)
                                                if (!arpError && mac) {
                                                        finalize(true)
                                                } else {
                                                        finalize(false)
                                                }
                                        })
                                        return
                                }

                                clearTimeout(timer)
                                finalize(false)
                        })
                })
        }

        private async executeWithBackoff<T>(
                options: NetworkScannerOptions,
                fn: () => Promise<T>
        ): Promise<T> {
                const enableBackoff =
                        options.enableBackoff ?? this.defaultOptions.enableBackoff ?? false
                const maxRetries = options.maxRetries ?? this.defaultOptions.maxRetries ?? 0
                const baseDelay = options.backoffBaseMs ?? this.defaultOptions.backoffBaseMs ?? 200

                let attempt = 0

                while (true) {
                        try {
                                return await fn()
                        } catch (error) {
                                if (!enableBackoff || attempt >= maxRetries) {
                                        throw error
                                }

                                const delay = baseDelay * Math.pow(2, attempt)
                                await new Promise(resolve => setTimeout(resolve, delay))
                                attempt += 1
                        }
                }
        }

        private async getCachedIp(agentKey: string): Promise<string | null> {
                const key = `${this.cacheKeyPrefix}${agentKey}`
                const memoryValue = await this.services?.infrastructure.cache.get(key)
                if (memoryValue) return memoryValue

                if (this.redis) {
                        try {
                                const redisValue = await this.redis.get(key)
                                if (redisValue) {
                                        await this.services?.infrastructure.cache.set(
                                                key,
                                                redisValue,
                                                this.cacheTtlSeconds
                                        )
                                        return redisValue
                                }
                        } catch (error) {
                                console.warn('[SCAN_NETWORK] Failed to read Redis cache', error)
                        }
                }

                return null
        }

        private async cacheAgentIp(agentKey: string, ip: string) {
                const key = `${this.cacheKeyPrefix}${agentKey}`

                await this.services?.infrastructure.cache.set(
                        key,
                        ip,
                        this.cacheTtlSeconds
                )

                if (this.redis) {
                        try {
                                await this.redis.set(key, ip, 'EX', this.cacheTtlSeconds)
                        } catch (error) {
                                console.warn('[SCAN_NETWORK] Failed to cache IP in Redis', error)
                        }
                }
        }
}
