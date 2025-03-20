'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAgentStatus } from '@/app/actions/prometheus.actions'
import { Device } from '@prisma/client'

interface AgentStatus {
    up: boolean;
}

export function useDeviceStatus(device: Device | null) {
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: ['device-status', device?.ipAddress],
        queryFn: async () => {
            if (!device) return null
            
            console.log('[DEVICE_STATUS] Checking status for device:', device.ipAddress)
            const result = await getAgentStatus(device.ipAddress)
            
            // Если статус успешно получен и отличается от текущего в кэше
            if (result.success && result.data && !Array.isArray(result.data)) {
                const currentData = queryClient.getQueryData(['devices']) as Device[] | undefined
                if (currentData) {
                    const deviceInCache = currentData.find(d => d.ipAddress === device.ipAddress)
                    const agentStatus = result.data as AgentStatus
                    if (deviceInCache && agentStatus.up !== undefined) {
                        console.log('[DEVICE_STATUS] Status changed, invalidating devices cache')
                        queryClient.invalidateQueries({ queryKey: ['devices'] })
                    }
                }
            }
            
            return result
        },
        enabled: !!device,
        refetchInterval: 30000,
        retry: 2,
        // Принудительно запрашиваем статус при монтировании
        refetchOnMount: true,
        // Отключаем кэширование для первого запроса
        staleTime: 0
    })
} 