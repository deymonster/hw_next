'use client'

import { useDevices } from "@/hooks/useDevices";
import type { ColumnDef } from "@tanstack/react-table";
import type { Device, DeviceStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation"

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

import { DataTable } from "@/components/ui/elements/DataTable";
import { useEffect, useMemo } from "react";
import { createDeviceColumns } from "./DeviceColumns";


const testDevices: Device[] = [
  {
    id: '1',
    name: 'Test Device 1',
    ipAddress: '192.168.1.100',
    status: 'ACTIVE',
    deviceTag: 'SERVER',
    agentKey: 'key1',
    serialNumber: 'SN123456',
    warrantyStatus: new Date('2025-12-31'),
    locationId: '1',
    type: 'WINDOWS',
    lastUpdate: new Date(),
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Test Device 2',
    ipAddress: '192.168.1.101',
    status: 'INACTIVE',
    deviceTag: 'WORKSTATION',
    agentKey: null,
    serialNumber: null,
    warrantyStatus: null,
    locationId: '2',
    type: 'LINUX',
    lastUpdate: new Date(),
    lastSeen: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Test Device 3',
    ipAddress: '192.168.1.102',
    status: 'PENDING',
    deviceTag: 'NETWORK',
    agentKey: 'key3',
    serialNumber: 'SN789012',
    warrantyStatus: new Date('2024-06-30'),
    locationId: '1',
    type: 'LINUX',
    lastUpdate: new Date(),
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '1',
    name: 'Test Device 1',
    ipAddress: '192.168.1.100',
    status: 'ACTIVE',
    deviceTag: 'SERVER',
    agentKey: 'key1',
    serialNumber: 'SN123456',
    warrantyStatus: new Date('2025-12-31'),
    locationId: '1',
    type: 'WINDOWS',
    lastUpdate: new Date(),
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Test Device 2',
    ipAddress: '192.168.1.101',
    status: 'INACTIVE',
    deviceTag: 'WORKSTATION',
    agentKey: null,
    serialNumber: null,
    warrantyStatus: null,
    locationId: '2',
    type: 'LINUX',
    lastUpdate: new Date(),
    lastSeen: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Test Device 3',
    ipAddress: '192.168.1.102',
    status: 'PENDING',
    deviceTag: 'NETWORK',
    agentKey: 'key3',
    serialNumber: 'SN789012',
    warrantyStatus: new Date('2024-06-30'),
    locationId: '1',
    type: 'LINUX',
    lastUpdate: new Date(),
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '1',
    name: 'Test Device 1',
    ipAddress: '192.168.1.100',
    status: 'ACTIVE',
    deviceTag: 'SERVER',
    agentKey: 'key1',
    serialNumber: 'SN123456',
    warrantyStatus: new Date('2025-12-31'),
    locationId: '1',
    type: 'WINDOWS',
    lastUpdate: new Date(),
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Test Device 2',
    ipAddress: '192.168.1.101',
    status: 'INACTIVE',
    deviceTag: 'WORKSTATION',
    agentKey: null,
    serialNumber: null,
    warrantyStatus: null,
    locationId: '2',
    type: 'LINUX',
    lastUpdate: new Date(),
    lastSeen: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Test Device 3',
    ipAddress: '192.168.1.102',
    status: 'PENDING',
    deviceTag: 'NETWORK',
    agentKey: 'key3',
    serialNumber: 'SN789012',
    warrantyStatus: new Date('2024-06-30'),
    locationId: '1',
    type: 'LINUX',
    lastUpdate: new Date(),
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '1',
    name: 'Test Device 1',
    ipAddress: '192.168.1.100',
    status: 'ACTIVE',
    deviceTag: 'SERVER',
    agentKey: 'key1',
    serialNumber: 'SN123456',
    warrantyStatus: new Date('2025-12-31'),
    locationId: '1',
    type: 'WINDOWS',
    lastUpdate: new Date(),
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Test Device 2',
    ipAddress: '192.168.1.101',
    status: 'INACTIVE',
    deviceTag: 'WORKSTATION',
    agentKey: null,
    serialNumber: null,
    warrantyStatus: null,
    locationId: '2',
    type: 'LINUX',
    lastUpdate: new Date(),
    lastSeen: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Test Device 3',
    ipAddress: '192.168.1.102',
    status: 'PENDING',
    deviceTag: 'NETWORK',
    agentKey: 'key3',
    serialNumber: 'SN789012',
    warrantyStatus: new Date('2024-06-30'),
    locationId: '1',
    type: 'LINUX',
    lastUpdate: new Date(),
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
]


export function DevicesTable() {
  const t = useTranslations('dashboard.devices')
  const router = useRouter()
  const { isLoading, fetchDevices, fetchStats } = useDevices()

  useEffect(() => {
    fetchDevices()
    fetchStats()
  }, [fetchDevices, fetchStats])

  const columns = useMemo(()=> createDeviceColumns((key: string) => t(key)), [t])


  return <div className='lg:px-10'>
    <Breadcrumb className="mt-5 flex items-center space-x-1 text-sm text-muted-foreground">
    <BreadcrumbItem>
        <BreadcrumbLink href="/devices" className="font-medium">
          Devices
        </BreadcrumbLink>
      </BreadcrumbItem>
    </Breadcrumb>

    <div className='mt-5'>
        {isLoading ? (
          <div>Loading ...</div>
        ): (
          <DataTable 
            columns={columns} 
            data={testDevices}
            pagination={{
              enabled: true,
              pageSize: 10,
              showPageSize: true,
              showPageNumber: true
            }}
          />
        )}
    </div>
  </div>
}