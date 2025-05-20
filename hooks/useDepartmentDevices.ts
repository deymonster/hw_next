'use client'

import { useQuery } from '@tanstack/react-query'
import { getDevices, getDeviceStatus } from '@/app/actions/device'
import { Device } from '@prisma/client'

interface DeviceOnlineStatus {
    isOnline: boolean
    lastSeen: Date | null
}

interface DeviceWithOnlineStatus extends Device {
    onlineStatus: DeviceOnlineStatus | null
}

export function useDepartmentDevices(options?: { departments?: string[] }) {
    const departments = options?.departments || []
    const hasDepartments = departments.length > 0
    
    const { data: devices, isLoading, error, refetch } = useQuery<DeviceWithOnlineStatus[], Error>({
        queryKey: ['department-devices', departments],
        queryFn: async (): Promise<DeviceWithOnlineStatus[]> => {
            // Если departments не указаны, получаем все устройства
            const departmentDevices = await getDevices(
                hasDepartments ? { 
                    departmentId: departments.length === 1 ? departments[0] : undefined,
                    ...(departments.length > 1 && { 
                        OR: departments.map(id => ({ departmentId: id }))
                    })
                } : {}
            );
            
            if (departmentDevices.length > 0) {
                return Promise.all(
                    departmentDevices.map(async (device): Promise<DeviceWithOnlineStatus> => {
                        const statusResult = await getDeviceStatus(device.id);
                        return {
                            ...device,
                            onlineStatus: (statusResult.success && statusResult.data) ? {
                                isOnline: statusResult.data.isOnline,
                                lastSeen: statusResult.data.lastSeen
                            } : null
                        };
                    })
                );
            }

            return [];
        },
        enabled: true // Теперь запрос будет выполняться всегда
    })

    return {
        devices,
        isLoading,
        error,
        refetch
    }
}