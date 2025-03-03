'use  server'

import { services } from '@/services'

const prometheus = services.infrastructure.prometheus

export async function getDeviceInfo(ipAddress: string) {
    try {
        const [systemInfo, hardwareInfo] = await Promise.all([
            prometheus.getSystemInfo(ipAddress),
            prometheus.getHardwareInfo(ipAddress)
        ])
        return {
            success: true,
            data: {
                systemInfo: systemInfo,
                hardwareInfo: hardwareInfo
            }
        }
    } catch (error) {
        console.error('Failed to get agent info:', error)
        return {
            success: false,
            error: 'Failed to get agent information'
        }
    }
}

export async function addDeviceTarget(ipAddress: string) {
    try {
        await prometheus.addTarget(ipAddress)
        return {
            success: true
        }
    } catch (error) {
        console.error('Failed to add target:', error)
        return {
            success: false,
            error: 'Failed to add target'
        }
    }
}