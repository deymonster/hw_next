'use client'

import { DeviceFilterOptions, IDeviceCreateInput } from "@/services/device/device.interfaces"
import { Device, DeviceStatus, DeviceType } from "@prisma/client"
import { useCallback, useState } from "react"
import { getDevices, getDevicesStats, updateDeviceStatus, updateDeviceIp, createDevice } from "@/app/actions/device"


interface UseDevicesOptions {
    onSuccess?: () => void
    onError?: (error: Error) => void
}


export function useDevices(options?: UseDevicesOptions) {
    const [devices, setDevices] = useState<Device[]>([])
    const [stats, setStats] = useState<{
        total: number
        byStatus: Record<DeviceStatus, number>
        byType: Record<DeviceType, number>
    }>()
    const [isLoading, setIsLoading] = useState(false)

    

    const fetchDevices = useCallback(async (filters?: DeviceFilterOptions) => {
        try {
            setIsLoading(true)
            const result = await getDevices(filters)
            setDevices(result)
            options?.onSuccess?.()
        } catch (error) {
            options?.onError?.(error as Error)
        } finally {
            setIsLoading(false)
        }
    }, [options])

    const addNewDevice = useCallback(async (data: IDeviceCreateInput) => {
        try {
            setIsLoading(true)
            const result = await createDevice(data)
            await fetchDevices()
            options?.onSuccess?.()
            return result
        } catch (error) {
            options?.onError?.(error as Error)
            return null
        } finally {
            setIsLoading(false)
        } 
    }, [options, fetchDevices])

    const fetchStats = useCallback(async () => {
        try {
            setIsLoading(true)
            const result = await getDevicesStats()
            setStats(result)
            options?.onSuccess?.()
        } catch (error) {
            options?.onError?.(error as Error)
        } finally {
            setIsLoading(false)
        }
    }, [options])


    const updateStatus = useCallback(async (id: string, status: DeviceStatus) => {
        try {
            setIsLoading(true)
            const result = await updateDeviceStatus(id, status)
            await fetchDevices()
            setDevices(devices => devices.map(device => {
                if (device.id === id) {
                    return result
                }
                return device
            }))
            options?.onSuccess?.()
        } catch (error) {
            options?.onError?.(error as Error)
        } finally {
            setIsLoading(false)
        }
    }, [options, fetchDevices])

    const updateIp = useCallback(async (id: string) => {
        try {
            setIsLoading(true)
            const result = await updateDeviceIp(id)
            await fetchDevices()
            console.log('Update IP result:', result);
            options?.onSuccess?.()
        } catch (error) {
            options?.onError?.(error as Error)
        } finally {
            setIsLoading(false)
        }
    }, [options, fetchDevices])


    return {
        devices,
        stats,
        isLoading,
        fetchDevices,
        fetchStats,
        updateStatus,
        updateIp,
        addNewDevice
    }

}