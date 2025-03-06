import { PrometheusTarget, PrometheusServiceConfig, PrometheusApiResponse } from "./prometheus.interfaces";
import path from 'path'
import fs from 'fs/promises'
import { PrometheusParser } from "./prometheus.parser";

export class PrometheusService {
    private readonly config: PrometheusServiceConfig

    constructor(config: PrometheusServiceConfig) {
        this.config = config
    }

    private getAuthHeader(): string {
        if (!this.config.auth.username || !this.config.auth.password) {
            console.error('Missing auth credentials:', {
                username: !!this.config.auth.username,
                password: !!this.config.auth.password
            })
        }
        return `Basic ${Buffer.from(`${this.config.auth.username}:${this.config.auth.password}`).toString('base64')}`
    }

    private async getParser(ipAddress: string): Promise<PrometheusParser> {
        const response = await this.getMetricsByIp(ipAddress)
        return new PrometheusParser(response)
    }

    private async reloadPrometheusConfig(): Promise<void> {
        try {
            const response = await fetch(`${this.config.url}/prometheus/-/reload`, {
                method: 'POST',
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            })
            if (!response.ok) {
                throw new Error(`Failed to reload prometheus config: ${response.statusText}`)
            }
        } catch (error) {
            throw new Error(`Failed to reload prometheus config: ${error}`)
        }
        
    }


    async addTarget(ipAddress: string): Promise<void> {
        try {
            const targetsPath = path.resolve(this.config.targetsPath)
            let targets: PrometheusTarget[] = []

            try {
                const content = await fs.readFile(targetsPath, 'utf-8')
                targets = JSON.parse(content)
            } catch (error) {
                console.warn(`Failed to read targets file: ${error}`)
                targets = []
            }

            // add new target
            if (targets.length === 0) {
                targets.push({
                    targets: [`${ipAddress}:9182`],
                    labels: { job: 'windows-agents' }
                })
            } else {
                // Add to existing targets array
                if (!targets[0].targets.includes(`${ipAddress}:9182`)) {
                    targets[0].targets.push(`${ipAddress}:9182`)
                }
            }
            await fs.writeFile(targetsPath, JSON.stringify(targets, null, 2))
            await this.reloadPrometheusConfig()
        } catch (error) {
            throw new Error(`Failed to add target: ${error}`)
        }
    }

    async removeTarget(ipAddress: string): Promise<void> {
        try {
            const targetsPath = path.resolve(this.config.targetsPath)
            let targets: PrometheusTarget[] = []
            try {
                const content = await fs.readFile(targetsPath, 'utf-8')
                targets = JSON.parse(content)
            } catch (error) {
                console.warn(`Failed to read targets file: ${error}`)
                targets = []
            }

            if (targets.length > 0) {
                targets[0].targets = targets[0].targets.filter(target => target !==`${ipAddress}:9182`)
            }
            await fs.writeFile(targetsPath, JSON.stringify(targets, null, 2))
            await this.reloadPrometheusConfig()
        } catch (error) {
            throw new Error(`Failed to remove target: ${error}`)
        }
    }


    async getMetricsByIp(ipAddress: string): Promise<PrometheusApiResponse> {
        try {
            const authHeader = this.getAuthHeader()
            const response = await fetch(`${this.config.url}/prometheus/api/v1/query?query={instance="${ipAddress}:9182"}`, {
                headers: {
                    'Authorization': authHeader
                }
            })
            
            if (!response.ok) {
                throw new Error(`Failed to fetch metrics: ${response.statusText}`)
            }
            return await response.json()
        } catch (error) {
            throw new Error(`Failed to get metrics: ${error}`)
        }
    }

    async getSystemInfo(ipAddress: string) {
        const parser = await this.getParser(ipAddress)
        return parser.getSystemInfo()
    }

    async getHardwareInfo(ipAddress: string) {
        const parser = await this.getParser(ipAddress)
        return parser.getHardwareInfo()
    }

    async getProcessorMetrics(ipAddress: string) {
        const parser = await this.getParser(ipAddress)
        return parser.getProcessorMetrics()
    }

    async getNetworkMetrics(ipAddress: string) {
        const parser = await this.getParser(ipAddress)
        return parser.getNetworkMetrics()
    }

    async getDiskMetrics(ipAddress: string) {
        const parser = await this.getParser(ipAddress)
        return parser.getDiskMetrics()
    }

    async getProcessList(ipAddress: string) {
        const parser = await this.getParser(ipAddress)
        return parser.getProcessList()
    }
}