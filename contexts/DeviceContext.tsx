'use client'

import { ReactNode, createContext, useContext, useRef, useCallback } from 'react';

interface DevicesContextType {
  refreshDevices: () => void;
  setRefreshDevices: (callback: () => void) => void;
}

const DevicesContext = createContext<DevicesContextType>({
  refreshDevices: () => {},
  setRefreshDevices: () => {},
});

export function DevicesProvider({ children }: { children: ReactNode }) {
    const refreshCallbackRef = useRef<() => void>(() => {})
    
    const setRefreshDevicesCallback = useCallback((callback: () => void) => {
        refreshCallbackRef.current = callback;
      }, []);
      
      const refreshDevicesCallback = useCallback(() => {
        refreshCallbackRef.current();
      }, []);

    const contextValue = useRef({
    refreshDevices: refreshDevicesCallback,
    setRefreshDevices: setRefreshDevicesCallback
    }).current;

    return (
      <DevicesContext.Provider value={contextValue}>
        {children}
      </DevicesContext.Provider>
    );
  }

export const useDevicesContext = () => useContext(DevicesContext);