'use client'

import { useQuery } from '@tanstack/react-query'
import { getDevices, getDeviceStatus } from '@/app/actions/device'
import { getEmployees } from '@/app/actions/employee'
import { Device } from '@prisma/client'

interface DepartmentDevicesOptions {
    departments: string[]
}

interface DeviceOnlineStatus {
    isOnline: boolean
    lastSeen: Date | null
}

interface DeviceWithOnlineStatus extends Device {
    onlineStatus: DeviceOnlineStatus | null
}

export function useDepartmentDevices({ departments }: DepartmentDevicesOptions) {
    const { data: devices, isLoading, error, refetch } = useQuery<DeviceWithOnlineStatus[], Error>({
        queryKey: ['department-devices', departments],
        queryFn: async (): Promise<DeviceWithOnlineStatus[]> => {
            // Получаем сотрудников выбранных отделов
            const employees = await getEmployees({ 
                departmentId: departments.length === 1 ? departments[0] : undefined,
                ...(departments.length > 1 && { 
                    OR: departments.map(id => ({ departmentId: id }))
                })
            });
            // Получаем все устройства
            const devicesPromises = employees.map(employee => 
                getDevices({ employeeId: employee.id })
            );
            const departmentDevices = await Promise.all(devicesPromises);

            // Объединяем все устройства в один массив и удаляем дубликаты по ID
            const uniqueDevices = Array.from(
                new Map(
                    departmentDevices.flat().map(device => [device.id, device])
                ).values()
            );

            if (uniqueDevices.length > 0) {
                // Получаем статус для каждого устройства
                return Promise.all(
                    uniqueDevices.map(async (device): Promise<DeviceWithOnlineStatus> => {
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

            return uniqueDevices as DeviceWithOnlineStatus[];
        },
        enabled: departments.length > 0 // Запрос будет выполняться только если есть выбранные отделы
    })

    return {
        devices,
        isLoading,
        error,
        refetch
    }
}