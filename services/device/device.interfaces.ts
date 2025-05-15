// export const CONFIG = {
//     METRICS_PORT: Number(process.env.METRICS_PORT) || 9182,
//     HANDSHAKE_KEY: process.env.AGENT_HANDSHAKE_KEY || 'VERY_SECRET_KEY',
//     PROMETHEUS_TARGETS_PATH:
//       '/Users/deymonster/My projects/HW monitor NextJS/hw-monitor/prometheus/targets/windows_targets.json',
//     PROMETHEUS_RELOAD_URL: 'http://localhost:9090/-/reload',
//   };
import { Device, DeviceStatus, DeviceType } from '@prisma/client'

export interface DeviceFilterOptions {
    status?: DeviceStatus[]
    type?: DeviceType
    departmentId?: string
    employeeId?: string
    orderBy?: {
        field: 'name' | 'lastUpdate' | 'lastSeen'
        direction: 'asc' | 'desc'
    }
}

export interface IDeviceCreateInput {
    name: string
    ipAddress: string
    agentKey: string
    type: DeviceType
    deviceTag?: string
    departmentId?: string
}

export interface IDeviceFindManyArgs {
    where?: {
        status?: DeviceStatus
        type?: DeviceType
        departmentId?: string
    }
    orderBy?: {
        [key: string]: 'asc' | 'desc'
    }
    take?: number
    skip?: number
}

export interface IDeviceRepository {
    // Базовые операции наследуются из IBaseRepository
    
    // Специфичные методы для устройств
    findByAgentKey(agentKey: string): Promise<Device | null>
    findByIpAddress(ipAddress: string): Promise<Device | null>
    findByLocation(departmentId: string): Promise<Device[]>
    findActiveDevices(): Promise<Device[]>
    updateStatus(id: string, status: DeviceStatus): Promise<Device>
    updateLastSeen(id: string): Promise<Device>
}