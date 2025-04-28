'use server'

import { services } from '@/services/index';
import { DeviceFilterOptions } from '@/services/device/device.interfaces'
import { Device, DeviceStatus, DeviceType } from '@prisma/client';
import { IDeviceCreateInput } from '@/services/device/device.interfaces'
import { getAgentStatuses } from './prometheus.actions';



export async function createDevice(data: IDeviceCreateInput): Promise<{
    success: boolean,
    device?: Device,
    error?: string
}> {
    console.log('[CACHE_SERVER] createDevice - Creating new device:', data.name);
    try {
        if (!data.ipAddress || !data.name) {
            throw new Error('IP address and name are required')
        }
        
        console.log(`[CREATE_DEVICE] Creating device: ${data.name} (${data.ipAddress})`);
        const newDevice = await services.data.device.create({
            name: data.name,
            ipAddress: data.ipAddress,
            agentKey: data.agentKey,
            type: data.type || DeviceType.WINDOWS
        })
        
        console.log(`[CREATE_DEVICE] Device created successfully: ${newDevice.id}`);
        
        return {
            success: true,
            device: newDevice
        }

    } catch (error) {
        console.error('[CACHE_SERVER] createDevice - Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create device'
        }
    }
}

export async function getDevices(options?: DeviceFilterOptions) {
  console.log('[GET_DEVICES] Fetching devices from database directly (no cache)');
  return services.data.device.findAll(options);
}

export async function getDevicesStats() {
    return await services.data.device.getDeviceStats()
}

export async function updateDeviceStatus(id: string, status: DeviceStatus) {
    console.log('[CACHE_SERVER] updateDeviceStatus - Updating device status:', { id, status });
    const updatedDevice = await services.data.device.updateStatus(id, status)
    return updatedDevice
}

export async function updateDeviceIp(agentKey: string) {
    console.log('[CACHE_SERVER] updateDeviceIp - Updating device IP for agent:', agentKey);
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
    
    const updatedDevice = await services.data.device.updateIpAddress(device.id, agent.ipAddress)
    return updatedDevice
    } catch (error) {
        console.error('[CACHE_SERVER] updateDeviceIp - Error:', error)
        throw error
    }
}

export async function deleteDeviceById(id: string) {
    console.log('[CACHE_SERVER] deleteDeviceById - Deleting device:', id);
    try {
        // First get the device to get its IP address
        const device = await services.data.device.findById(id);
        if (!device) {
            console.error(`[DELETE_DEVICE] Device with ID ${id} not found`);
            throw new Error(`Device with ID ${id} not found`);
        }
        
        console.log(`[DELETE_DEVICE] Deleting device: ${device.name} (${device.ipAddress})`);
        
        // Remove from Prometheus targets first
        try {
            await services.infrastructure.prometheus.removeTarget(device.ipAddress);
            console.log(`[DELETE_DEVICE] Removed from Prometheus targets: ${device.ipAddress}`);
        } catch (promError) {
            console.error(`[DELETE_DEVICE] Failed to remove from Prometheus:`, promError);
            // Continue with deletion even if Prometheus removal fails
        }
        
        // Then delete from database
        const deletedDevice = await services.data.device.deleteDevice(id);
        console.log(`[DELETE_DEVICE] Deleted from database: ${deletedDevice.name}`);
        
        return deletedDevice;
    } catch (error) {
        console.error('[CACHE_SERVER] deleteDeviceById - Error:', error);
        throw error;
    }
}

export async function updateAllDeviceStatuses(): Promise<number> {
    try {
        // Get all devices
        const devices = await services.data.device.findMany();
        
        if (!devices.length) return 0;
        
        // Get all IP addresses
        const ipAddresses = devices.map(device => device.ipAddress);
        
        // Update statuses in batch using the action
        await getAgentStatuses(ipAddresses);
        
        return devices.length;
    } catch (error) {
        console.error('Failed to update device statuses:', error);
        return 0;
    }
}


