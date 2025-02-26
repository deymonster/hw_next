'use server'

import { services } from '@/services/index';
import { DeviceFilterOptions } from '@/services/device/device.interfaces'
import { DeviceStatus } from '@prisma/client';

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