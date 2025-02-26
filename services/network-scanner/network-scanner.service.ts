import { networkInterfaces } from 'os'
import { DeviceType } from '@prisma/client'
import axios from 'axios'
import { NetworkDiscoveredAgent, NetworkScannerOptions } from './network-scanner.interfaces'
import { IServices } from '../types'

export class NetworkScannerService {
    private readonly defaultOptions: 
        NetworkScannerOptions = {
            timeout: 3000,
            concurrency: 25,
            agentPort: 9182
        }
    constructor(private readonly services: IServices) {}

    async getCurrentSubnet(): Promise<string> {
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

    async scanNetwork(options?: NetworkScannerOptions): Promise<NetworkDiscoveredAgent[]> {
        console.log('[SCAN_NETWORK] Starting network scan...')
        const opts = { ...this.defaultOptions, ...options }
        const subnet = options?.subnet || await this.getCurrentSubnet()

        const baseIp = subnet.split('/')[0]
        const agents: NetworkDiscoveredAgent[] = []

        const ips = Array.from({ length: 254 }, (_, i) => baseIp.replace(/\.0$/, `.${i + 1}`))
        
        // Разбиваем на чанки для параллельного сканирования
        const chunks = this.chunkArray(ips, opts.concurrency!)
        

        for (const chunk of chunks) {
            const promises = chunk.map(ip => this.checkAndGetAgent(ip, opts))
            const results = await Promise.all(promises)
            const foundAgents = results.filter(Boolean) as NetworkDiscoveredAgent[]
            

            // Если ищем конкретного агента и нашли его - сразу возвращаем
            if (opts.targetAgentKey) {
                const targetAgent = foundAgents.find(agent => agent.agentKey === opts.targetAgentKey)
                if (targetAgent) {
                    console.log('[SCAN_NETWORK] Found target agent:', targetAgent)
                    return [targetAgent]
                }
            }
            agents.push(...foundAgents)
        }
        console.log('Founded agents: ', agents)
        return agents
    }

    async findAgentNewIp(targetAgentKey: string, options?: Omit<NetworkScannerOptions, 'targetAgentKey'>): Promise<string | null> {
        const agents = await this.scanNetwork({ ...options, targetAgentKey })
        return agents.length > 0 ? agents[0].ipAddress : null
    }

    async checkAgent(ipAddress: string): Promise<boolean> {
        const agent = await this.checkAndGetAgent(ipAddress, this.defaultOptions)
        return agent !== null
    }

    private async checkAndGetAgent(ip: string, options: NetworkScannerOptions): Promise<NetworkDiscoveredAgent | null> {
        try {
            
            const response = await axios.get(`http://${ip}:${options.agentPort}/metrics`, {
                timeout: options.timeout,
                headers: {
                    'X-Agent-Handshake-Key': process.env.AGENT_HANDSHAKE_KEY || 'VERY_SECRET_KEY'
                }
            }).catch((error) => {
                // Детальное логирование ошибки
                console.log(`[CHECK_AGENT] [${ip}] Error type: ${error.code || 'unknown'}`)
                console.log(`[CHECK_AGENT] [${ip}] Full error:`, error.message)
                throw error; // Перебрасываем ошибку дальше
            });

            if (response.status === 200) {
                
                const metrics = response.data as string

                // Получаем UUID системы
                const uuidMatch = metrics.match(/UNIQUE_ID_SYSTEM{uuid="([^"]+)"}/)
                if (!uuidMatch) {
                    return null
                }

                // Парсим параметры system_information
                
                return {
                    ipAddress: ip,
                    agentKey: uuidMatch[1],
                    isRegistered: false
                }
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
}