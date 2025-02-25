import { networkInterfaces } from 'os'
import { DeviceType } from '@prisma/client'
import axios from 'axios'
import { NetworkDiscoveredAgent, NetworkScannerOptions } from './network-scanner.interfaces'
import { IServices } from '../types'

export class NetworkScannerService {
    private readonly defaultOptions: 
        NetworkScannerOptions = {
            timeout: 1000,
            concurrency: 50,
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
                    return [{ ...targetAgent, isRegistered: true }]
                }
            }
            agents.push(...foundAgents)
        }
        if (opts.targetAgentKey) {
            return []
        }

        // Проверяем, какие агенты уже зарегистрированы
        const agentKeys = agents.map(agent => agent.agentKey)
        const registeredAgents = await this.services.data.device.findManyByAgentKeys(agentKeys)
        const registeredKeys = new Set(registeredAgents.map(device => device.agentKey))
        
        return agents.map(agent => ({
            ...agent,
            isRegistered: registeredKeys.has(agent.agentKey)
        }))
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
            })

            if (response.status === 200) {
                const metrics = response.data as string

                // Получаем UUID системы
                const uuidMatch = metrics.match(/UNIQUE_ID_SYSTEM{uuid="([^"]+)"}/)
                if (!uuidMatch) return null

                // Получаем информацию о системе
                const sysInfoMatch = metrics.match(/system_information{([^}]+)}/)
                if (!sysInfoMatch) return null

                // Парсим параметры system_information
                const sysInfoParams = sysInfoMatch[1].split(',').reduce((acc, param) => {
                    const [key, value] = param.split('=')
                    acc[key] = value.replace(/"/g, '')
                    return acc
                }, {} as Record<string, string>)



                return {
                    ipAddress: ip,
                    agentKey: uuidMatch[1],
                    type: sysInfoParams.os_version.toLowerCase().includes('windows') ? 'WINDOWS' : 'LINUX',
                    isRegistered: false,
                    systemInfo: {
                        manufacturer: sysInfoParams.manufacturer,
                        model: sysInfoParams.model,
                        name: sysInfoParams.name,
                        osArchitecture: sysInfoParams.os_architecture,
                        osVersion: sysInfoParams.os_version
                    }
                }
            }
        } catch (error) {
            // Игнорируем ошибки - это нормально при сканировании
        }
        return null
    }

    private determineDeviceType(headers: Record<string, string>): DeviceType {
        const osInfo = headers['x-agent-os']?.toLowerCase() || ''
        return osInfo.includes('windows') ? 'WINDOWS' : 'LINUX'
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = []
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size))
        }
        return chunks
    }
}