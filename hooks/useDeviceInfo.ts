import { addDeviceTarget, getAgentStatuses, getDeviceInfo } from "@/app/actions/prometheus.actions"
import { createDevice } from "@/app/actions/device"
import { DeviceType } from "@prisma/client"
import { useState } from "react"

export const useDeviceInfo = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [deviceInfo, setDeviceInfo] = useState<any>(null)

    const getInfo = async (ipAddress: string) => {
        try {
            setIsLoading(true)
            setError(null)

            const result =  await getDeviceInfo(ipAddress)

            if (!result.success) {
                throw new Error(result.error)
            }

            setDeviceInfo(result.data)
            console.log('Device Info', result.data)
            return result.data
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to scan device'
            setError(errorMessage)
            console.error('Scanning error:', error)
            return null
        } finally {
            setIsLoading(false)
        }
    }
    
    const addMultipleDevices = async (ipAddresses: string[]): Promise<{
        success: boolean
        addedCount: number
        errors: {[ip: string]: string}
    }> => {
        try {
            console.log(`[DEVICE_INFO_HOOK] Starting to add ${ipAddresses.length} devices...`);
            // Добавляем все устройства в Prometheus
            const addResult = await addDeviceTarget(ipAddresses)
            if (!addResult.success) {
                console.warn(`[DEVICE_INFO_HOOK] Warning: Failed to add targets to Prometheus: ${addResult.error}`)
                // Продолжаем выполнение, даже если не удалось добавить цели в Prometheus
            }

            // Получаем статусы всех агентов
            const statusResults = await getAgentStatuses(ipAddresses)

            // Обрабатываем каждое устройство
            const errors: {[ip: string]: string} = {};
            let addedCount = 0;
            const createdDevices = [];

            for (const ipAddress of ipAddresses) {
                try {
                    // Проверяем статус агента
                    const agentStatus = statusResults.data?.[ipAddress];
                    
                    // Пытаемся получить информацию об устройстве
                    let deviceInfo;
                    try {
                        deviceInfo = await getDeviceInfo(ipAddress);
                    } catch (infoError) {
                        console.warn(`[DEVICE_INFO_HOOK] Warning: Failed to get device info for ${ipAddress}: ${infoError}`);
                    }
                    
                    // Если не удалось получить информацию или статус, создаем устройство с временными данными
                    if (!deviceInfo?.success || !deviceInfo?.data || !deviceInfo?.data.systemInfo || !deviceInfo?.data.systemInfo.name) {
                        console.log(`[DEVICE_INFO_HOOK] Creating device with temporary data for ${ipAddress}`);
                        
                        // Получаем агентский ключ из результатов сканирования
                        const agent = await fetch(`/dashboard/devices/scan?ip=${ipAddress}`, {
                            method: 'POST'
                        }).then(res => res.json()).catch(() => null);
                        
                        const agentKey = agent?.agentKey || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                        
                        // Создаем устройство с временными данными
                        const createResult = await createDevice({
                            name: `Device-${ipAddress.split('.').pop()}`,
                            ipAddress: ipAddress,
                            agentKey: agentKey,
                            type: DeviceType.WINDOWS
                        });
                        
                        if (!createResult.success) {
                            errors[ipAddress] = `Failed to add device to database`;
                            continue;
                        }
                        
                        if (createResult.device) {
                            createdDevices.push(createResult.device);
                        }
                        
                        addedCount++;
                        continue;
                    }
                    
                    // Если получили информацию, создаем устройство с полными данными
                    const { systemInfo } = deviceInfo.data;
                    
                    const createResult = await createDevice({
                        name: systemInfo.name || `Device-${ipAddress.split('.').pop()}`,
                        ipAddress: ipAddress,
                        agentKey: systemInfo.uuid || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                        type: DeviceType.WINDOWS
                    });
                    
                    if (!createResult.success) {
                        errors[ipAddress] = `Failed to add device to database`;
                        continue;
                    }
                    
                    if (createResult.device) {
                        createdDevices.push(createResult.device);
                    }
                    
                    addedCount++;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors[ipAddress] = errorMessage;
                    console.error(`[DEVICE_INFO_HOOK] Error processing device ${ipAddress}:`, error);
                }
            }

            // Выводим информацию о созданных устройствах
            console.log(`[DEVICE_INFO_HOOK] Created ${createdDevices.length} devices:`, 
                createdDevices.map(d => ({ id: d.id, name: d.name, ip: d.ipAddress })));

            return {
                success: addedCount > 0,
                addedCount,
                errors
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[DEVICE_INFO_HOOK] Failed to add multiple devices:', error);
            return {
                success: false,
                addedCount: 0,
                errors: { general: errorMessage }
            };
        }
    }

    const addDevice = async (ipAddress: string | string[]) => {
        try {
            const result = await addDeviceTarget(ipAddress)
            if (!result.success) {
                throw new Error(result.error)
            }
            return true
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add device'
            setError(errorMessage)
            console.error('Add device error:', error)
            return false
        }
    }

    return {
        getInfo,
        addDevice,
        isLoading,
        error,
        deviceInfo,
        addMultipleDevices
    }
}