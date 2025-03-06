'use server'

import { services } from '@/services/index';
import { DeviceFilterOptions } from '@/services/device/device.interfaces'
import { Device, DeviceStatus, DeviceType } from '@prisma/client';
import { IDeviceCreateInput } from '@/services/device/device.interfaces'
import { Agent } from 'http';



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

export async function updateDeviceIp(agentKey: string) {
    try {
        const device = await services.data.device.findByAgentKey(agentKey)
    if (!device) {
        throw new Error(`Device with agentKey ${agentKey} not found`)
    }
    const scanResults = await services.infrastructure.network_scanner.scanNetwork({
        targetAgentKey: agentKey
    })
    if (!scanResults.length) {
        throw new Error(`Device with agentKey ${agentKey} not found in network`)
    }
    const agent = scanResults[0]
    
    return await services.data.device.updateIpAddress(device.id, agent.ipAddress)
    } catch (error) {
        console.log('[UPDATE_DEVICE_IP]', error)
        throw error
    }
}

export async function deleteDeviceById(id: string) {
    try {
        const deletedDevice = await services.data.device.deleteDevice(id)
        await services.infrastructure.prometheus.removeTarget(deletedDevice.ipAddress)
        return deletedDevice
    } catch (error) {
        console.log('Failed to delete device:', error)
        throw error
    }
}


