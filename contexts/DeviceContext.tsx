'use client'

import { ReactNode, createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';
import { Device } from "@prisma/client"


interface DeviceContextType {
  devices: Device[]
  setDevices: (devices: Device[]) => void
  refreshDevices: () => void
  setRefreshDevices: (fn: () => void) => void
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  forceRefresh: () => void
}

export const DeviceContext = createContext<DeviceContextType>({
  devices: [],
  setDevices: () => {},
  refreshDevices: () => {},
  setRefreshDevices: () => {},
  isLoading: false,
  setIsLoading: () => {},
  forceRefresh: () => {}
});

export function DevicesProvider({ children }: { children: ReactNode }) {
    const refreshCallbackRef = useRef<() => void>(() => {})
    const [devices, setDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshCounter, setRefreshCounter] = useState(0);

    const setDevicesWithCache = useCallback((newDevices: Device[]) => {
        setDevices(newDevices);
    }, []);

    const setRefreshDevicesCallback = useCallback((callback: () => void) => {
        refreshCallbackRef.current = callback;
    }, []);
      
    const refreshDevicesCallback = useCallback(() => {
        try {
            refreshCallbackRef.current();
        } catch (error) {
            console.error('[CACHE] DeviceContext - Error in refreshDevices:', error);
        }
    }, []);
    
    // Функция для принудительного обновления списка устройств
    const forceRefreshCallback = useCallback(() => {
        setRefreshCounter(prev => prev + 1);
        
        try {
            refreshCallbackRef.current();
        } catch (error) {
            console.error('[CACHE] DeviceContext - Error in force refresh:', error);
        }
    }, []);

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