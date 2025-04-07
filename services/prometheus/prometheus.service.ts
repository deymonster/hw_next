import { 
    PrometheusTarget, 
    PrometheusServiceConfig, 
    PrometheusApiResponse,
    TimeRange,
    TimeRangeParams,
    MetricTimeSeries,
    AgentStatus
} from "./prometheus.interfaces";
import { EventEmitter } from 'events';
import path from 'path'
import fs from 'fs/promises'
import { PrometheusParser } from "./prometheus.parser";
import { MetricType, PROMETHEUS_METRICS } from "./metrics";

/**
 * Сервис для работы с Prometheus API
 * Обеспечивает:
 * - Управление целями мониторинга (добавление/удаление устройств)
 * - Получение метрик устройств
 * - Кэширование метрик
 * - Подписку на обновления метрик
 * - Автоматическое обновление метрик
 * - Очистку устаревших данных
 */
export class PrometheusService {
    private readonly config: PrometheusServiceConfig
    private readonly emitter = new EventEmitter()
    private readonly staticDataCache: Map<string, {
        lastUpdate: number,
        data: {
            systemInfo: any,
            hardwareInfo: any
        }
    }> = new Map()

    private readonly dynamicMetricsCache: Map<string, {
        lastUpdate: number,
        metrics: any,
        subscribers: number
    }> = new Map()

    private readonly updateInterval = 30000 // 30 секунд
    private readonly staticDataMaxAge = 24 * 60 * 60 * 1000 // 24 часа
    private readonly dynamicDataMaxAge = 120000 // 2 минуты

    constructor(config: PrometheusServiceConfig) {
        this.config = config
        this.startMetricsCollection()
    }

    /**
     * Получает статические данные устройства (системная информация и железо)
     * Кэширует данные на 24 часа
     */
    public async getDeviceStaticData(deviceId: string) {
        const cached = this.staticDataCache.get(deviceId)
        const now = Date.now()

        // Проверяем актуальность кэша
        if (cached && (now - cached.lastUpdate) < this.staticDataMaxAge) {
            return cached.data
        }

        // Получаем новые данные
        // Получаем только статические метрики
        const response = await this.getMetricsByIp(deviceId, MetricType.STATIC)
        const parser = new PrometheusParser(response)
        const data = {
            systemInfo: parser.getSystemInfo(),
            hardwareInfo: parser.getHardwareInfo()
        }

        // Обновляем кэш
        this.staticDataCache.set(deviceId, {
            lastUpdate: now,
            data
        })

        return data
    }

    /**
     * Подписка на динамические метрики устройства
     */
    public subscribe(deviceId: string, callback: (metrics: any) => void) {
        const eventName = `metrics:${deviceId}`
        this.emitter.on(eventName, callback)

        // Инициализируем или обновляем запись в кэше
        const cached = this.dynamicMetricsCache.get(deviceId)
        if (cached) {
            cached.subscribers++
            // Отправляем последние известные метрики
            if (cached.metrics) {
                callback(cached.metrics)
            }
        } else {
            this.dynamicMetricsCache.set(deviceId, {
                lastUpdate: 0,
                metrics: null,
                subscribers: 1
            })
            // Запускаем сбор метрик для этого устройства
            this.updateDeviceMetrics(deviceId)
        }

        // Возвращаем функцию отписки
        return () => {
            this.emitter.removeListener(eventName, callback)
            const cache = this.dynamicMetricsCache.get(deviceId)
            if (cache) {
                cache.subscribers--
                // Если больше нет подписчиков, удаляем устройство из кэша
                if (cache.subscribers <= 0) {
                    this.dynamicMetricsCache.delete(deviceId)
                }
            }
        }
    }

    /**
     * Обновляет динамические метрики для устройства
     */
    private async updateDeviceMetrics(deviceId: string) {
        try {
            const cached = this.dynamicMetricsCache.get(deviceId)
            if (!cached || cached.subscribers <= 0) {
                return // Не обновляем метрики если нет подписчиков
            }

            // Проверяем не устарели ли данные
            const now = Date.now()
            if (cached.lastUpdate && (now - cached.lastUpdate) > this.dynamicDataMaxAge) {
                console.warn(`Metrics for device ${deviceId} are stale, fetching new data`) 
            }
            
            this.log('info', `Получаем динамические метрики для ${deviceId}`)
            
            // Получаем динамические метрики
            
            const dynamicResponse = await this.getMetricsByIp(deviceId, MetricType.DYNAMIC)
            
            const dynamicParser = new PrometheusParser(dynamicResponse)
            
            // Получаем метрики процессов
            const processResponse = await this.getMetricsByIp(deviceId, MetricType.PROCESS)
            const processParser = new PrometheusParser(processResponse)
            
            const processorMetrics = dynamicParser.getProcessorMetrics()
            this.log('info', `Parsed processor metrics:`, processorMetrics)
            
            const networkMetrics = dynamicParser.getNetworkMetrics()
            this.log('info', `Parsed network metrics:`, networkMetrics)
            
            const diskMetrics = dynamicParser.getDiskMetrics()
            this.log('info', `Parsed disk metrics:`, diskMetrics)
            
            const memoryMetrics = dynamicParser.getMemoryMetrics()
            this.log('info', `Parsed memory metrics:`, memoryMetrics)


            const newMetrics = {
                processorMetrics,
                networkMetrics,
                diskMetrics,
                memoryMetrics,
                processList: processParser.getProcessList(),
                timestamp: now
            }
            

            // Обновляем кэш и оповещаем подписчиков только если данные изменились
            if (!cached.metrics || this.hasMetricsChanged(cached.metrics, newMetrics)) {
                cached.metrics = newMetrics
                cached.lastUpdate = now
                this.emitter.emit(`metrics:${deviceId}`, newMetrics)
            }

        } catch (error) {
            this.log('error', `Error updating metrics for device ${deviceId}:`, error)
        }
    }

    /**
     * Эффективное сравнение метрик без полной сериализации
     */
    private hasMetricsChanged(oldMetrics: any, newMetrics: any): boolean {
        if (!oldMetrics || !newMetrics) return true

        // Сравниваем только ключевые метрики вместо полной сериализации
        return (
            oldMetrics.processorMetrics?.usage !== newMetrics.processorMetrics?.usage ||
            oldMetrics.memoryMetrics?.usage?.used !== newMetrics.memoryMetrics?.usage?.used ||
            oldMetrics.networkMetrics?.some((old: any, i: number) => 
                old.performance.rx !== newMetrics.networkMetrics[i]?.performance.rx ||
                old.performance.tx !== newMetrics.networkMetrics[i]?.performance.tx
            ) ||
            oldMetrics.diskMetrics?.some((old: any, i: number) => 
                old.performance.rx !== newMetrics.diskMetrics[i]?.performance.rx ||
                old.performance.tx !== newMetrics.diskMetrics[i]?.performance.tx
            )
        )
    }

    /**
     * Запускает сбор метрик только для устройств с активными подписчиками
     */
    private startMetricsCollection() {
        const collectMetrics = async () => {
            try {
                // Получаем только устройства с активными подписчиками
                const deviceIds = Array.from(this.dynamicMetricsCache.entries())
                    .filter(([_, cache]) => cache.subscribers > 0)
                    .map(([deviceId]) => deviceId)

                // Обновляем метрики параллельно
                await Promise.all(deviceIds.map(deviceId => this.updateDeviceMetrics(deviceId)))

            } catch (error) {
                console.error('[PROMETHEUS_SERVICE] Error collecting metrics:', error)
            }
        }

        setInterval(collectMetrics, this.updateInterval)
    }

    /**
     * Добавляет устройство в мониторинг
     * @param deviceId ID устройства
     */
    public addDeviceToMonitoring(deviceId: string) {
        if (!this.dynamicMetricsCache.has(deviceId)) {
            this.dynamicMetricsCache.set(deviceId, {
                lastUpdate: 0,
                metrics: null,
                subscribers: 0
            })
        }
    }

    /**
     * Удаляет устройство из мониторинга
     * @param deviceId ID устройства
     */
    public removeDeviceFromMonitoring(deviceId: string) {
        this.dynamicMetricsCache.delete(deviceId)
    }

    /**
     * Формирует заголовок авторизации
     * @returns Строка с заголовком Basic Auth
     */
    private getAuthHeader(): string {
        if (!this.config.auth.username || !this.config.auth.password) {
            console.error('Missing auth credentials:', {
                username: !!this.config.auth.username,
                password: !!this.config.auth.password
            })
        }
        return `Basic ${Buffer.from(`${this.config.auth.username}:${this.config.auth.password}`).toString('base64')}`
    }

    /**
     * Создает экземпляр парсера для указанного устройства
     * @param ipAddress IP-адрес устройства
     * @returns Экземпляр PrometheusParser
     */
    private async getParser(ipAddress: string): Promise<PrometheusParser> {
        const response = await this.getMetricsByIp(ipAddress)
        return new PrometheusParser(response)
    }

    /**
     * Логирует сообщение с указанным уровнем
     * @param level Уровень логирования
     * @param message Сообщение
     * @param data Дополнительные данные
     */
    private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
        // Убираем условную фильтрацию, чтобы логировать все сообщения
        const timestamp = new Date().toISOString();
        const prefix = `[PROMETHEUS_SERVICE][${timestamp}]`;
        
        if (data) {
            console[level](`${prefix} ${message}`, data);
        } else {
            console[level](`${prefix} ${message}`);
        }
    }

    /**
     * Перезагружает конфигурацию Prometheus
     */
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

    /**
     * Ожидает указанное время после перезагрузки конфигурации
     * @param ms Время ожидания в миллисекундах
     */
    private async waitAfterReload(ms: number = 1000): Promise<void> {
        this.log('info', `Waiting ${ms}ms for Prometheus to apply configuration...`)
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Получает статус агента Prometheus
     * @param ipAddress IP-адрес устройства (опционально)
     * @returns Статус агента или массив статусов
     */
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

    /**
     * Ожидает доступности метрик для устройства
     * @param ipAddress IP-адрес устройства
     * @param maxAttempts Максимальное количество попыток
     * @param delayMs Задержка между попытками в миллисекундах
     * @returns true если метрики доступны, false если нет
     */
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

    /**
     * Добавляет цель мониторинга
     * @param ipAddress IP-адрес устройства или массив адресов
     * @param waitForMetrics Ожидать ли доступности метрик
     * @returns Результат добавления цели
     * @throws Error если targetsPath не указан в конфигурации
     */
    async addTarget(ipAddress: string | string[], waitForMetrics = true): Promise<boolean | {[ip: string]: boolean}> {
        if (!this.config.targetsPath) {
            throw new Error('targetsPath не указан в конфигурации. Управление целями недоступно.');
        }
        
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

    /**
     * Удаляет цель мониторинга
     * @param ipAddress IP-адрес устройства
     * @throws Error если targetsPath не указан в конфигурации
     */
    async removeTarget(ipAddress: string): Promise<void> {
        if (!this.config.targetsPath) {
            throw new Error('targetsPath не указан в конфигурации. Управление целями недоступно.');
        }
        
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

    
    /**
 * Получает метрики от Prometheus для указанного IP адреса
 * @param ipAddress IP адрес устройства
 * @param type Тип запрашиваемых метрик
 * @param specificMetrics Конкретные метрики (опционально)
 */
async getMetricsByIp(
    ipAddress: string, 
    type?: MetricType,
    specificMetrics?: string[]
): Promise<PrometheusApiResponse> {
    try {
        // Определяем какие метрики запрашивать
        let metricsToQuery: string[] = []
        
        if (specificMetrics?.length) {
            // Если переданы конкретные метрики, используем их
            metricsToQuery = specificMetrics
            this.log('info', 'Using specific metrics:', { metrics: specificMetrics })
        } else if (type) {
            // Если указан тип - получаем метрики из конфига
            if (type === MetricType.STATIC) {
                metricsToQuery = [
                    ...PROMETHEUS_METRICS[MetricType.STATIC].system,
                    ...PROMETHEUS_METRICS[MetricType.STATIC].hardware
                ]
                
            } else if (type === MetricType.DYNAMIC) {
                metricsToQuery = [
                    ...PROMETHEUS_METRICS[MetricType.DYNAMIC].cpu,
                    ...PROMETHEUS_METRICS[MetricType.DYNAMIC].memory,
                    ...PROMETHEUS_METRICS[MetricType.DYNAMIC].disk,
                    ...PROMETHEUS_METRICS[MetricType.DYNAMIC].network,
                ]
                
                
            } else if (type === MetricType.PROCESS) {
                metricsToQuery = [...PROMETHEUS_METRICS[MetricType.PROCESS].process]
                
            }
            
        } else {
            throw new Error('Either type or specificMetrics must be provided')
        }

        if (!metricsToQuery.length) {
            throw new Error(`No metrics found for type: ${type}`)
        }

        // Формируем запрос к Prometheus
        const query = `{instance="${ipAddress}:9182",__name__=~"${metricsToQuery.join('|')}"}`;
        console.log('QUERY', query)
        // Создаем URL для запроса
        const url = new URL('/prometheus/api/v1/query', this.config.url)
        url.searchParams.append('query', query)

        // Выполняем запрос
        const response = await fetch(url.toString(), {
            headers: { 
                'Authorization': this.getAuthHeader(),
                'Accept': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`)
        }

        const data = await response.json()
        
        return data
    } catch (error) {
        this.log('error', `Error fetching metrics for ${ipAddress}:`, error)
        throw error
        }
    }

    /**
     * Получает метрики с временным диапазоном
     * @param ipAddress IP-адрес устройства
     * @param metricName Имя метрики
     * @param range Диапазон времени (например, "5m" для 5 минут)
     * @param step Шаг для точек данных (например, "30s" для 30 секунд)
     * @param additionalLabels Дополнительные лейблы для запроса
     * @returns Ответ Prometheus API с временным рядом
     */
    async getMetricsRange(
        ipAddress: string, 
        metricName: string, 
        range: string = "15m",
        step: string = "15s",
        additionalLabels: Record<string, string> = {}
    ): Promise<PrometheusApiResponse> {
        try {
            const authHeader = this.getAuthHeader();
            const end = Math.floor(Date.now() / 1000);
            const start = end - this.parseTimeRange(range);
            
            // Формируем лейблы для запроса
            const labels = {
                name: metricName,  // Используем name вместо __name__
                instance: `${ipAddress}:9182`,
                ...additionalLabels
            };
            const labelString = Object.entries(labels)
                .map(([key, value]) => `${key}="${value}"`)
                .join(',');
            
            // Создаем PromQL запрос
            const query = encodeURIComponent(`{${labelString}}`);
            
            const url = `${this.config.url}/prometheus/api/v1/query_range?` + 
                       `query=${query}&start=${start}&end=${end}&step=${this.parseTimeRange(step)}`;
            
            this.log('info', `Fetching metrics range:`, {
                metric: metricName,
                labels: labels,
                timeRange: {
                    start: new Date(start * 1000).toISOString(),
                    end: new Date(end * 1000).toISOString(),
                    step: step
                },
                url: url
            });
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch metrics range: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.log('info', `Received metrics range response:`, {
                status: data.status,
                resultType: data.data?.resultType,
                resultCount: data.data?.result?.length || 0,
                timeRange: {
                    start: new Date(start * 1000).toISOString(),
                    end: new Date(end * 1000).toISOString(),
                    step: step
                }
            });
            
            if (data.data.result.length === 0) {
                this.log('warn', `No data found for query:`, {
                    metric: metricName,
                    labels: labels,
                    timeRange: {
                        start: new Date(start * 1000).toISOString(),
                        end: new Date(end * 1000).toISOString()
                    }
                });
            }
            
            return data;
        } catch (error) {
            this.log('error', `Error getting metrics range for ${ipAddress}:`, error);
            throw new Error(`Failed to get metrics range: ${error}`);
        }
    }

    /**
     * Преобразует строку временного диапазона в секунды
     * @param timeStr Строка времени (например, "5m", "30s")
     * @returns Количество секунд
     */
    private parseTimeRange(timeStr: string): number {
        const value = parseInt(timeStr)
        const unit = timeStr.slice(-1)
        switch (unit) {
            case 's': return value
            case 'm': return value * 60
            case 'h': return value * 3600
            case 'd': return value * 86400
            default: throw new Error(`Unknown time unit: ${unit}`)
        }
    }

    /**
     * Получает системную информацию устройства
     * @param ipAddress IP-адрес устройства
     * @returns Системная информация
     */
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

    /**
     * Получает информацию об аппаратном обеспечении
     * @param ipAddress IP-адрес устройства
     * @returns Информация об аппаратном обеспечении
     */
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

    /**
     * Получает метрики процессора
     * @param ipAddress IP-адрес устройства
     * @returns Метрики процессора
     */
    async getProcessorMetrics(ipAddress: string) {
        const parser = await this.getParser(ipAddress)
        return parser.getProcessorMetrics()
    }

    /**
     * Получает метрики сети
     * @param ipAddress IP-адрес устройства
     * @returns Метрики сети
     */
    async getNetworkMetrics(ipAddress: string) {
        const parser = await this.getParser(ipAddress)
        return parser.getNetworkMetrics()
    }

    /**
     * Получает метрики дисков
     * @param ipAddress IP-адрес устройства
     * @returns Метрики дисков
     */
    async getDiskMetrics(ipAddress: string) {
        const parser = await this.getParser(ipAddress)
        return parser.getDiskMetrics()
    }

    /**
     * Получает список процессов
     * @param ipAddress IP-адрес устройства
     * @returns Список процессов
     */
    async getProcessList(ipAddress: string) {
        const parser = await this.getParser(ipAddress)
        return parser.getProcessList()
    }

    /**
     * Получает временные ряды основных метрик
     * @param ipAddress IP-адрес устройства
     * @param metricName Имя метрики
     * @param timeRange Параметры временного диапазона:
     *   - start: начальное время (unix timestamp)
     *   - end: конечное время (unix timestamp)
     *   - range: предустановленный период (например, "5m")
     *   - step: шаг для точек данных (например, "15s")
     * @param additionalLabels Дополнительные лейблы для фильтрации метрик
     * @returns Массив временных рядов с метриками
     * @throws Error при ошибке получения данных
     */
    async getMetricsTimeSeries(
        ipAddress: string,
        metricName: string,
        timeRange: TimeRangeParams = { range: '5m' },
        additionalLabels: Record<string, string> = {}
    ): Promise<MetricTimeSeries[]> {
        try {
            // Определяем временной диапазон
            const end = timeRange.end || Math.floor(Date.now() / 1000);
            const start = timeRange.start || (
                timeRange.range 
                    ? end - this.parseTimeRange(timeRange.range)
                    : end - (5 * 60)  // по умолчанию 5 минут
            );
            const step = timeRange.step || this.calculateOptimalStep(start, end);

            // Формируем лейблы для запроса
            const labels = {
                instance: `${ipAddress}:9182`,
                ...additionalLabels
            };
            const labelString = Object.entries(labels)
                .map(([key, value]) => `${key}="${value}"`)
                .join(',');

            // Создаем PromQL запрос
            const query = encodeURIComponent(`${metricName}{${labelString}}`);
            const url = `${this.config.url}/prometheus/api/v1/query_range?` + 
                       `query=${query}&start=${start}&end=${end}&step=${step}`;

            this.log('info', `Fetching metrics time series:`, {
                metric: metricName,
                labels,
                timeRange: {
                    start: new Date(start * 1000).toISOString(),
                    end: new Date(end * 1000).toISOString(),
                    step
                }
            });

            const response = await fetch(url, {
                headers: {
                    'Authorization': this.getAuthHeader()
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch metrics time series: ${response.statusText}`);
            }

            const data: PrometheusApiResponse = await response.json();

            if (data.status !== 'success') {
                throw new Error(`Prometheus API error: ${data.error || 'Unknown error'}`);
            }

            return data.data.result.map(series => ({
                metric: {
                    name: series.metric.__name__,  // Используем __name__ как name
                    instance: series.metric.instance,
                    job: series.metric.job,
                    ...Object.entries(series.metric)
                        .filter(([key]) => !['__name__', 'instance', 'job'].includes(key))
                        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
                },
                values: series.values?.map(([timestamp, value]) => ({
                    timestamp: Number(timestamp),
                    value: parseFloat(value)
                })) || []
            }));

        } catch (error) {
            this.log('error', `Error getting metrics time series for ${ipAddress}:`, error);
            throw error;
        }
    }

    /**
     * Рассчитывает оптимальный шаг для временного ряда
     * Правила выбора шага:
     * - до 5 минут: 15 секунд
     * - до 15 минут: 30 секунд
     * - до 1 часа: 1 минута
     * - до 4 часов: 5 минут
     * - до 24 часов: 15 минут
     * - более 24 часов: 1 час
     * @param start Начальное время
     * @param end Конечное время
     * @returns Строка с оптимальным шагом
     */
    private calculateOptimalStep(start: number, end: number): string {
        const duration = end - start;
        
        // Подбираем оптимальный шаг в зависимости от длительности
        if (duration <= 300) return '15s';        // до 5 минут
        if (duration <= 900) return '30s';        // до 15 минут
        if (duration <= 3600) return '1m';        // до 1 часа
        if (duration <= 14400) return '5m';       // до 4 часов
        if (duration <= 86400) return '15m';      // до 24 часов
        return '1h';                              // более 24 часов
    }

    /**
     * Получает последние метрики за указанный период
     * Это удобный метод-обертка над getMetricsTimeSeries для получения
     * последних метрик с предустановленным периодом
     * @param ipAddress IP-адрес устройства
     * @param metricName Имя метрики
     * @param range Временной период (по умолчанию "5m")
     * @param additionalLabels Дополнительные лейблы
     * @returns Массив временных рядов с метриками
     */
    async getLastMetrics(
        ipAddress: string,
        metricName: string,
        range: TimeRange = '5m',
        additionalLabels: Record<string, string> = {}
    ): Promise<MetricTimeSeries[]> {
        return this.getMetricsTimeSeries(ipAddress, metricName, { range }, additionalLabels);
    }
}