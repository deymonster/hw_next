'use client'

import { ReactNode, createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';
import { Device } from "@prisma/client"


interface DeviceContextType {
  devices: Device[]
  setDevices: (devices: Device[]) => void
  refreshDevices: () => Promise<void>
  setRefreshDevices: (fn: () => Promise<void>) => void
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  forceRefresh: () => Promise<void>
}

export const DeviceContext = createContext<DeviceContextType>({
  devices: [],
  setDevices: () => {},
  refreshDevices: async () => {},
  setRefreshDevices: () => {},
  isLoading: false,
  setIsLoading: () => {},
  forceRefresh: async () => {}
});

export function DevicesProvider({ children }: { children: ReactNode }) {
    const refreshCallbackRef = useRef<() => Promise<void>>(() => Promise.resolve())
    const [devices, setDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshCounter, setRefreshCounter] = useState(0);

    const setDevicesWithCache = useCallback((newDevices: Device[]) => {
        console.log('[DEVICES_CONTEXT] Setting devices with cache:', newDevices);
        setDevices(newDevices);
        console.log('[DEVICES_CONTEXT] Devices updated in context, new length:', newDevices.length);
    }, []);

    const setRefreshDevicesCallback = useCallback((callback: () => Promise<void>) => {
        refreshCallbackRef.current = callback;
    }, []);
      
    const refreshDevicesCallback = useCallback(async () => {
        try {
            setIsLoading(true);
            await refreshCallbackRef.current();
        } catch (error) {
            console.error('[CACHE] DeviceContext - Error in refreshDevices:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    // Функция для принудительного обновления списка устройств
    const forceRefreshCallback = useCallback(async () => {
        try {
            setIsLoading(true);
            setRefreshCounter(prev => prev + 1);
            await refreshCallbackRef.current();
        } catch (error) {
            console.error('[CACHE] DeviceContext - Error in force refresh:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);
    console.log('[DEVICES_CONTEXT] Initializing with devices:', devices)
    return (
        <DeviceContext.Provider value={{
            devices,
            setDevices: setDevicesWithCache,
            refreshDevices: refreshDevicesCallback,
            setRefreshDevices: setRefreshDevicesCallback,
            isLoading,
            setIsLoading,
            forceRefresh: forceRefreshCallback
        }}>
            {children}
        </DeviceContext.Provider>
    );
}

export const useDevicesContext = () => useContext(DeviceContext);