'use server'

import { services } from '@/services/index';
import { DeviceFilterOptions } from '@/services/device/device.interfaces'
import { Device, DeviceStatus, DeviceType } from '@prisma/client';
import { IDeviceCreateInput } from '@/services/device/device.interfaces'



export async function createDevice(data: IDeviceCreateInput): Promise<Device> {
    try {
        if (!data.ipAddress || !data.name) {
            throw new Error('IP address and name are required')
        }
        
        await services.infrastructure.prometheus.addTarget(data.ipAddress)

        return await services.data.device.create({
            name: data.name,
            ipAddress: data.ipAddress,
            agentKey: data.agentKey,
            type: data.type || DeviceType.WINDOWS,
            status: DeviceStatus.ACTIVE,
        })
    } catch (error) {
        console.log('Failed to create device:', error)
        throw error
    }
}

export async function getDevices(options?: DeviceFilterOptions
) {
    return services.data.device.findAll(options)
}


export async function getDevicesStats() {
    return await services.data.device.getDeviceStats()
}

export async function updateDeviceStatus(id: string, status: DeviceStatus) {
    return await services.data.device.updateStatus(id, status)
}

export async function updateDeviceIp(id: string, ipAddress: string) {
    return await services.data.device.updateIpAddress(id, ipAddress)
}