import { PrometheusTarget, PrometheusServiceConfig, PrometheusApiResponse, AgentStatus } from "./prometheus.interfaces";
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

    private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const prefix = `[PROMETHEUS_SERVICE][${timestamp}]`;
        
        if (level === 'info') {
            if (data) {
                console.log(`${prefix} ${message}`, data);
            } else {
                console.log(`${prefix} ${message}`);
            }
        } else if (level === 'warn') {
            if (data) {
                console.warn(`${prefix} ${message}`, data);
            } else {
                console.warn(`${prefix} ${message}`);
            }
        } else if (level === 'error') {
            if (data) {
                console.error(`${prefix} ${message}`, data);
            } else {
                console.error(`${prefix} ${message}`);
            }
        }
    }

    private async reloadPrometheusConfig(): Promise<void> {
        try {
            this.log('info', `Reloading Prometheus configuration...`)
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
            this.log('info', `Prometheus configuration reloaded successfully`)
        } catch (error) {
            throw new Error(`Failed to reload prometheus config: ${error}`)
        }
        
    }

    private async waitAfterReload(ms: number = 1000): Promise<void> {
        this.log('info', `Waiting ${ms}ms for Prometheus to apply configuration...`)
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    

    async getAgentStatus(ipAddress?: string): Promise<AgentStatus | AgentStatus[]> {
        try {
            const authHeader = this.getAuthHeader()
            const response = await fetch(`${this.config.url}/prometheus/api/v1/targets`, {
                headers: {
                    'Authorization': authHeader
                }
            })
            if (!response.ok) {
                throw new Error(`Failed to fetch targets: ${response.statusText}`)
            }
            const data = await response.json()
            const activeTargets = data.data.activeTargets as Array<{
                health: string;
                lastError: string;
                lastScrape: string;
                lastScrapeDuration: number;
                scrapeInterval: string;
                scrapeTimeout: string;
                labels: { instance: string; [key: string]: string };
            }>

            if (!ipAddress) {
                return activeTargets.map((target) => ({
                    health: target.health,
                    lastError: target.lastError || '',
                    lastScrape: target.lastScrape,
                    lastScrapeDuration: target.lastScrapeDuration,
                    scrapeInterval: target.scrapeInterval,
                    scrapeTimeout: target.scrapeTimeout,
                    up: target.health === 'up'
                }))
            }
            const targetAgent = activeTargets.find(
                (target) => target.labels.instance === `${ipAddress}:9182`
            )

            if (!targetAgent) {
                return {
                    health: 'unknown',
                    lastError: 'Agent not found in Prometheus targets',
                    lastScrape: '',
                    lastScrapeDuration: 0,
                    scrapeInterval: '',
                    scrapeTimeout: '',
                    up: false
                }
            }

            return {
                health: targetAgent.health,
                lastError: targetAgent.lastError || '',
                lastScrape: targetAgent.lastScrape,
                lastScrapeDuration: targetAgent.lastScrapeDuration,
                scrapeInterval: targetAgent.scrapeInterval,
                scrapeTimeout: targetAgent.scrapeTimeout,
                up: targetAgent.health === 'up'
            }

        } catch (error) {
            console.error(`[PROMETHEUS_SERVICE] Failed to get targets status:`, error)
            
            if (ipAddress) {
                return {
                    health: 'error',
                    lastError: `Failed to get agent status: ${error}`,
                    lastScrape: '',
                    lastScrapeDuration: 0,
                    scrapeInterval: '',
                    scrapeTimeout: '',
                    up: false
                }
            }
            
            return []
        }
    }

    async waitForMetricsAvailability(ipAddress: string, maxAttempts = 10, delayMs = 2000): Promise<boolean> {
        this.log('info', `Waiting for metrics availability for ${ipAddress}...`)
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                this.log('info', `Attempt ${attempt}/${maxAttempts} to get metrics for ${ipAddress}`)
                
                // Проверяем статус агента
                const status = await this.getAgentStatus(ipAddress);
                this.log('info', `Agent status for ${ipAddress}:`, status);
                
                // Пробуем получить метрики независимо от статуса агента
                try {
                    const response = await this.getMetricsByIp(ipAddress);
                    if (response && response.data && response.data.result && response.data.result.length > 0) {
                        this.log('info', `Metrics available for ${ipAddress}, result count: ${response.data.result.length}`);
                        return true;
                    } else {
                        this.log('info', `No metrics available yet for ${ipAddress}`);
                    }
                } catch (metricError) {
                    this.log('warn', `Error fetching metrics (attempt ${attempt}/${maxAttempts}):`, metricError);
                }
                
                // Ждем перед следующей попыткой
                this.log('info', `Waiting ${delayMs}ms before next attempt...`)
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } catch (error) {
                this.log('warn', `Error checking metrics availability (attempt ${attempt}/${maxAttempts}):`, error)
                // Продолжаем попытки даже при ошибке
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        
        this.log('warn', `Failed to get metrics after ${maxAttempts} attempts for ${ipAddress}`)
        return false;
    } 

    async addTarget(ipAddress: string | string[], waitForMetrics = true): Promise<boolean | {[ip: string]: boolean}> {
        // Если передан массив IP-адресов
        if (Array.isArray(ipAddress)) {
            this.log('info', `Adding multiple targets: ${ipAddress.join(', ')}...`);
            const results: {[ip: string]: boolean} = {};
            
            try {
                const targetsPath = path.resolve(this.config.targetsPath);
                let targets: PrometheusTarget[] = [];
    
                try {
                    const content = await fs.readFile(targetsPath, 'utf-8');
                    targets = JSON.parse(content);
                    this.log('info', `Current targets:`, targets);
                } catch (error) {
                    this.log('warn', `Failed to read targets file:`, error);
                    targets = [];
                }
    
                // Создаем структуру, если она пуста
                if (targets.length === 0) {
                    targets.push({
                        targets: [],
                        labels: { job: 'windows-agents' }
                    });
                }
    
                // Добавляем все новые цели
                let addedCount = 0;
                for (const ip of ipAddress) {
                    if (!targets[0].targets.includes(`${ip}:9182`)) {
                        targets[0].targets.push(`${ip}:9182`);
                        addedCount++;
                    }
                }
    
                if (addedCount > 0) {
                    this.log('info', `Writing updated targets with ${addedCount} new entries:`, targets);
                    await fs.writeFile(targetsPath, JSON.stringify(targets, null, 2));
                    await this.reloadPrometheusConfig();
                    
                    // Ждем после перезагрузки конфигурации
                    await this.waitAfterReload(1500);
                } else {
                    this.log('info', `No new targets to add, all already exist`);
                }
                
                // Проверяем доступность метрик для каждого IP
                if (waitForMetrics) {
                    for (const ip of ipAddress) {
                        results[ip] = await this.waitForMetricsAvailability(ip);
                    }
                } else {
                    for (const ip of ipAddress) {
                        results[ip] = true;
                    }
                }
                
                return results;
            } catch (error) {
                this.log('error', `Failed to add multiple targets:`, error);
                // Заполняем результаты ошибками для всех IP
                for (const ip of ipAddress) {
                    results[ip] = false;
                }
                return results;
            }
        }
        
        // Оригинальная логика для одного IP-адреса
        try {
            this.log('info', `Adding target for ${ipAddress}...`)
            const targetsPath = path.resolve(this.config.targetsPath)
            let targets: PrometheusTarget[] = []
    
            try {
                const content = await fs.readFile(targetsPath, 'utf-8')
                targets = JSON.parse(content)
                this.log('info', `Current targets:`, targets)
            } catch (error) {
                this.log('warn', `Failed to read targets file:`, error)
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
            this.log('info', `Writing updated targets:`, targets)
            await fs.writeFile(targetsPath, JSON.stringify(targets, null, 2))
            await this.reloadPrometheusConfig()
    
            await this.waitAfterReload(1500)
    
            if (waitForMetrics) {
                return await this.waitForMetricsAvailability(ipAddress);
            }
            return true
        } catch (error) {
            this.log('error', `Failed to add target:`, error)
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
            this.log('info', `Getting metrics for ${ipAddress}...`)
            const authHeader = this.getAuthHeader()
            const response = await fetch(`${this.config.url}/prometheus/api/v1/query?query={instance="${ipAddress}:9182"}`, {
                headers: {
                    'Authorization': authHeader
                }
            })
            
            if (!response.ok) {
                throw new Error(`Failed to fetch metrics: ${response.statusText}`)
            }
            const data =  await response.json()
            this.log('info', `Metrics response status: ${data.status}, result count: ${data.data?.result?.length || 0}`)
            return data
        } catch (error) {
            this.log('error', `Error getting metrics for ${ipAddress}:`, error)
            throw new Error(`Failed to get metrics: ${error}`)
        }
    }

    async getSystemInfo(ipAddress: string) {
        
        try {
            this.log('info', `Getting system info for ${ipAddress}...`);
            const parser = await this.getParser(ipAddress)
            const info = parser.getSystemInfo();
            this.log('info', `System info retrieved:`, info);
            return info;
        } catch (error) {
            this.log('error', `Failed to get system info:`, error);
            throw error;
        }
    }

    async getHardwareInfo(ipAddress: string) {
        try {
            console.log(`[PROMETHEUS_SERVICE] Getting system info for ${ipAddress}...`);
            const parser = await this.getParser(ipAddress)
            const info = parser.getSystemInfo();
            console.log(`[PROMETHEUS_SERVICE] System info retrieved:`, info);
            return info;
        } catch (error) {
            console.error(`[PROMETHEUS_SERVICE] Failed to get system info:`, error);
            throw error;
        }
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