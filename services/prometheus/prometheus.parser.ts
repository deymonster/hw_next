import { 
    PrometheusApiResponse, 
    PrometheusMetricResult,
    SystemInformation,
    UUIDMetric,
    SerialNumber,
    BiosInfo,
    MotherBoardInfo,
    MemoryInfo,
    GpuInfo,
    CpuUsagePercent,
    CpuTemperature,
    DiskHealthStatus,
    NetworkStatus,
    ActiveProcessMemoryUsage,
    ProccessCpuUsagePercent
} from './prometheus.interfaces'

export class PrometheusParser {
    private readonly data: PrometheusMetricResult[]

    constructor(response: PrometheusApiResponse) {
        this.data = response.data.result
    }

    private findMetric<T>(name: string): T | undefined {
        return this.data.find(item => item.metric.__name__ === name)?.metric as T
    }

    private findMetrics<T>(name: string): T[] {
        return this.data
            .filter(item => item.metric.__name__ === name)
            .map(item => item.metric as T)
    }

    private getValue(name: string): string | undefined {
        return this.data.find(item => item.metric.__name__ === name)?.value[1]
    }

    private bytesToGB(bytes: number): number {
        return Number((bytes / (1024 * 1024 * 1024)).toFixed(2))
    }

    private bytesToMB(bytes: number): number {
        return Number((bytes / (1024 * 1024)).toFixed(2))
    }

    getSystemInfo() {
        const systemInfo = this.findMetric<SystemInformation>('system_information')
        const uuid = this.findMetric<UUIDMetric>('UNIQUE_ID_SYSTEM')
        const serialNumber = this.findMetric<SerialNumber>('device_serial_number_info')

        return {
            uuid: uuid?.uuid,
            manufacturer: systemInfo?.manufacturer,
            model: systemInfo?.model,
            name: systemInfo?.name,
            osArchitecture: systemInfo?.os_architecture,
            osVerion: systemInfo?.os_version,
            deviceTag: serialNumber?.device_tag,
            location: serialNumber?.location,
            serialNumber: serialNumber?.serial_number
        }
    }

    getHardwareInfo() {
        const bios = this.findMetric<BiosInfo>('bios_info')
        const motherboard = this.findMetric<MotherBoardInfo>('motherboard_info')
        const memoryModules = this.findMetrics<MemoryInfo>('memory_module_info')
        const gpus = this.findMetrics<GpuInfo>('gpu_info')

        const disks = this.findMetrics<DiskHealthStatus>('disk_health_status')
        const cpuInfo = this.findMetric<CpuUsagePercent>('cpu_usage_percent')
        const networkInterfaces = this.findMetrics<NetworkStatus>('network_status')

        return {
            cpu: {
                model: cpuInfo?.processor
            },
            motherboard: {
                manufacturer: motherboard?.manufacturer,
                product: motherboard?.product,
                serialNumber: motherboard?.serial_number,
                version: motherboard?.version
            },
            bios: {
                manufacturer: bios?.manufacturer,
                version: bios?.version,
                date: bios?.release_date
            },
            memory: {
                modules: memoryModules.map(module => ({
                    capacity: module.capacity,
                    manufacturer: module.manufacturer,
                    partNumber: module.part_number,
                    serialNumber: module.serial_number,
                    speed: module.speed
                })),
                usage: {
                    total: this.bytesToGB(Number(this.getValue('total_memory_bytes') || 0)),
                    used: this.bytesToGB(Number(this.getValue('used_memory_bytes') || 0)),
                    free: this.bytesToGB(Number(this.getValue('free_memory_bytes') || 0)),
                    percent: Number(((Number(this.getValue('used_memory_bytes') || 0) / Number(this.getValue('total_memory_bytes') || 1)) * 100).toFixed(2))
                }
            },
            disks: disks.map(disk => ({
                model: disk.disk,
                type: disk.type,
                size: this.bytesToGB(Number(disk.size)),
                health: disk.status,
                usage: {
                    total: this.bytesToGB(Number(this.getValue(`disk_usage_bytes{disk="${disk.disk}",type="total"}`) || 0)),
                    used: this.bytesToGB(Number(this.getValue(`disk_usage_bytes{disk="${disk.disk}",type="used"}`) || 0)),
                    free: this.bytesToGB(Number(this.getValue(`disk_usage_bytes{disk="${disk.disk}",type="free"}`) || 0)),
                    percent: Number(this.getValue(`disk_usage_percent{disk="${disk.disk}"}`) || 0)
                }
            })),
            gpus: gpus.map(gpu => ({
                name: gpu.name,
                memory: {
                    total: this.bytesToGB(Number(this.getValue(`gpu_memory_bytes{name="${gpu.name}"}`) || 0)),
                }
            })),
            network: networkInterfaces.map(iface => ({
                name: iface.interface,
                status: Number(this.getValue(`network_status{interface="${iface.interface}"}`) || 0) === 1 ? 'up': 'down'
            }))
        }

    }

    getProcessorMetrics() {
        const cpuUsage = this.findMetric<CpuUsagePercent>('cpu_usage_percent')
        const cpuTemperatures = this.findMetrics<CpuTemperature>('cpu_temperature')

        return {
            model: cpuUsage?.processor,
            usage: Number(this.getValue('cpu_usage_percent') || 0),
            temperature: {
                sensors: cpuTemperatures.map(sensor => ({
                    name: sensor.sensor,
                    value: Number(this.getValue(`cpu_temperature{sensor="${sensor.sensor}"}`) || 0)
                })),
                average: Number((cpuTemperatures.reduce((acc, sensor) => 
                    acc + Number(this.getValue(`cpu_temperature{sensor="${sensor.sensor}"}`) || 0), 0) / cpuTemperatures.length).toFixed(2)
                )
            }
        }
    }

    getNetworkMetrics() {
        const networkInterfaces = this.findMetrics<NetworkStatus>('network_status')

        return networkInterfaces.map(iface => ({
            name: iface.interface,
            status: Number(this.getValue(`network_status{interface="${iface.interface}"}`) || 0) == 1 ? 'up': 'down',
            performance: {
                rx: this.bytesToGB(Number(this.getValue(`network_rx_bytes_per_second{interface="${iface.interface}"}`) || 0)),
                tx: this.bytesToGB(Number(this.getValue(`network_tx_bytes_per_second{interface="${iface.interface}"}`) || 0)),
            },
            errors: Number(this.getValue(`network_errors{interface="${iface.interface}"}`) || 0),
            droppedPackets: Number(this.getValue(`network_dropped_packets{interface="${iface.interface}"}`) || 0)
        }))
    }

    getDiskMetrics() {
        const disks = this.findMetrics<DiskHealthStatus>('disk_health_status')

        return disks.map(disk => ({
            model: disk.disk,
            type: disk.type,
            performance: {
                rx: Number(this.getValue(`disk_read_bytes_per_second{disk="${disk.disk}"}`)) || 0,
                tx: Number(this.getValue(`disk_write_bytes_per_second{disk="${disk.disk}"}`)) || 0,
            }
        }))
    }

    getProcessList() {
        const processesMemory = this.findMetrics<ActiveProcessMemoryUsage>('active_process_memory_usage')
        const processesCpu = this.findMetrics<ProccessCpuUsagePercent>('proccess_cpu_usage_percent')
        
        const cpuUsageByPid = new Map(
            processesCpu.map(process => [
                process.pid,
                Number(this.getValue(`proccess_cpu_usage_percent{pid="${process.pid}"}`) || 0)
            ])
        )
        return processesMemory.map(process => ({
            name: process.process,
            pid: process.pid,
            metrics: {
                memory: {
                    mb: this.bytesToMB(Number(this.getValue(`active_proccess_memory_usage{pid="${process.pid}"}`) || 0)),
                    percent: Number((Number(this.getValue(`active_proccess_memory_usage{pid="${process.pid}"}`) || 0) / Number(this.getValue('total_memory_bytes') || 1) * 100).toFixed(2))
                },
                cpu: cpuUsageByPid.get(process.pid) || 0
            }
        })).sort((a, b) => b.metrics.cpu - a.metrics.cpu)
    }


}