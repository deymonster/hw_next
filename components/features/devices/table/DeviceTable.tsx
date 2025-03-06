'use client'

import { useDevices } from "@/hooks/useDevices";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation"
import { useState } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

import { DataTable } from "@/components/ui/elements/DataTable";
import { useCallback, useEffect, useMemo, createContext,  useContext} from "react";
import { createDeviceColumns } from "./DeviceColumns";
import { useDevicesContext } from "@/contexts/DeviceContext";
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
  const { setRefreshDevices } = useDevicesContext()
  const router = useRouter()
  
  const { isLoading, fetchDevices, fetchStats, devices } = useDevices()

  const stableRefreshFn = useCallback(() => {
    fetchDevices();
  }, [fetchDevices])

  useEffect(() => {
    fetchDevices();
    fetchStats();    

    setRefreshDevices(stableRefreshFn)
  }, [])

  const handleRowClick = (device: Device) => {
    setSelectedDevice(device);
  }


  const columns = useMemo(()=> createDeviceColumns((key: string) => t(key)), [t])


  return (
    <DeviceSelectionContext.Provider value={{ selectedDevice, setSelectedDevice }}>
      <div className='lg:px-10'>
        <Breadcrumb className="mt-5 flex items-center space-x-1 text-sm text-muted-foreground">
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/devices" className="font-medium">
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
          {isLoading ? (
            <div>Loading ...</div>
          ) : selectedDevice ? (
            <DeviceDetail 
              device={selectedDevice} 
              onBack={() => setSelectedDevice(null)} 
            />
          ) : (
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
          )}
        </div>
      </div>
    </DeviceSelectionContext.Provider>
  )
  
}