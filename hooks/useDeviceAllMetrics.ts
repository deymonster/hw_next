import { useEffect } from 'react';
import { useDeviceMetrics } from './useDeviceMetrics';
import { useProcessMetrics } from './useProcessMetrics';

export function useDeviceAllMetrics(deviceId: string) {
    const {
        metrics: sseMetrics,
        error: sseError,
        isConnecting: sseConnecting
    } = useDeviceMetrics(deviceId);
    
    
    
    const {
        data: processMetrics,
        error: processError,
        isConnected: wsConnected,
        isLoading: wsLoading,
        reconnect: wsReconnect,
        lastUpdated
    } = useProcessMetrics(deviceId);
    

    useEffect(() => {
        wsReconnect();
    }, [deviceId ]);

    return {
        metrics: {
            system: sseMetrics?.systemInfo,
            hardware: sseMetrics?.hardwareInfo,
            processorMetrics: sseMetrics?.processorMetrics,
            diskMetrics: sseMetrics?.diskMetrics,
            memoryMetrics: sseMetrics?.memoryMetrics,
            networkMetrics: sseMetrics?.networkMetrics,
            processes: processMetrics,
            lastUpdated
        },
        status: {
            sseConnecting,
            wsConnected,
            wsLoading
        },
        errors: {
            sseError,
            processError
        },
        actions: {
            reconnect: wsReconnect
        }
        // TODO: Implement health checks and automatic reconnection 
        // - Add Docker health checks for Prometheus
        // - Add automatic service restart on network recovery
        // - Implement retry mechanism for failed connections
    };

}