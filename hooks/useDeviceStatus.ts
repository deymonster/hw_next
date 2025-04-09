'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAgentStatus } from '@/app/actions/prometheus.actions'
import { Device } from '@prisma/client'
import { usePathname } from 'next/navigation'

interface AgentStatus {
    up: boolean;
}

export function useDeviceStatus(device: Device | null) {
    const queryClient = useQueryClient()
    const pathname = usePathname()
    const isDeviceList = pathname === '/devices'

    return useQuery({
        queryKey: ['device-status', device?.ipAddress],
        queryFn: async () => {
            if (!device) return null
            
            console.log('[DEVICE_STATUS] Checking status for device:', device.ipAddress)
            const result = await getAgentStatus(device.ipAddress)
            
            // Если статус успешно получен и отличается от текущего в кэше
            if (isDeviceList && result.success && result.data && !Array.isArray(result.data)) {
                const agentStatus = result.data as AgentStatus
                if (agentStatus.up !== undefined) {
                    const currentData = queryClient.getQueryData(['devices']) as Device[] | undefined
                    const deviceInCache = currentData?.find(d => d.ipAddress === device.ipAddress)
                    
                    if (deviceInCache) {
                        console.log('[DEVICE_STATUS] Status changed, invalidating devices cache')
                        queryClient.invalidateQueries({ queryKey: ['devices'] })
                    }
                }
            }
            
            return result
        },
        enabled: !!device,
        refetchInterval: isDeviceList ? 30000 : 60000,
        retry: 2,
        // Принудительно запрашиваем статус при монтировании только на странице списка
        refetchOnMount: isDeviceList,
        // Используем кэширование на странице детализации
        staleTime: isDeviceList ? 0 : 30000
    })
} 