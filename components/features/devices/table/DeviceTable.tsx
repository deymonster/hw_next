'use client'

import { useDevices } from "@/hooks/useDevices";
import { useTranslations } from "next-intl";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"

import { useQuery } from '@tanstack/react-query'

import { DataTable } from "@/components/ui/elements/DataTable";
import { createContext, useContext } from "react";
import { createDeviceColumns } from "./DeviceColumns";
import { Device } from "@prisma/client";
import { DeviceDetail } from "../detail/DeviceDetail"

interface DeviceSelectionContextType {
  selectedDevice: Device | null;
  setSelectedDevice: (device: Device | null) => void;
}

const DeviceSelectionContext = createContext<DeviceSelectionContextType | undefined>(undefined);

export const useDeviceSelection = () => {
  const context = useContext(DeviceSelectionContext);
  if (!context) {
    throw new Error("useDeviceSelection must be used within a DeviceSelectionProvider");
  }
  return context;
}

export function DevicesTable() {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const t = useTranslations('dashboard.devices')
  const { fetchDevices, fetchStats } = useDevices();
  
  // Запрос данных с помощью React Query
  const { 
    data: devices = [], // пустой массив как значение по умолчанию
    isLoading,
    error,
    refetch: refreshDevices
  } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      console.log('[QUERY] Fetching devices...')
      const devices = await fetchDevices()
      await fetchStats() // обновляем статистику
      console.log('[QUERY] Fetched devices:', devices)
      return devices
    }
  })

  const handleRowClick = (device: Device) => {
    setSelectedDevice(device);
  }

  const columns = useMemo(()=> createDeviceColumns((key: string) => t(key)), [t])

  // Обработка состояния загрузки
  if (isLoading) {
    return <div className="flex items-center justify-center p-4">Loading devices...</div>
  }

  // Обработка ошибок
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-red-500">
        <p>Error loading devices</p>
        <Button onClick={() => refreshDevices()} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <DeviceSelectionContext.Provider value={{ selectedDevice, setSelectedDevice }}>
      <div className='lg:px-10'>
        <Breadcrumb className="mt-5 flex items-center space-x-1 text-sm text-muted-foreground">
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => setSelectedDevice(null)} className="font-medium">
              devices
            </BreadcrumbLink>
          </BreadcrumbItem>
          {selectedDevice && (
            <>
              <BreadcrumbItem>
                <span>{selectedDevice.name}</span>
              </BreadcrumbItem>
            </>
          )}
        </Breadcrumb>
  
        <div className='mt-5'>
          
          {selectedDevice ? (
            <DeviceDetail 
              device={selectedDevice} 
              onBack={() => setSelectedDevice(null)} 
            />
          ) : (
            <>
              
              <DataTable 
                columns={columns} 
                data={devices}
                onRowClick={handleRowClick}
                pagination={{
                  enabled: true,
                  pageSize: 10,
                  showPageSize: true,
                  showPageNumber: true
                }}
                filtering={{
                  enabled: true,
                  column: 'deviceTag',
                  placeholder: 'Search by tag...'
                }}
              />
            </>
          )}
        </div>
      </div>
    </DeviceSelectionContext.Provider>
  );
}