'use client'

import { useDevices } from "@/hooks/useDevices";
import type { ColumnDef } from "@tanstack/react-table";
import type { Device, DeviceStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation"

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdowmmenu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, RefreshCw, Trash } from "lucide-react";

import { DataTable } from "@/components/ui/elements/DataTable";
import { useEffect } from "react";
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";


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
  }
]


export function DevicesTable() {
  const t = useTranslations('dashboard.devices')
  const router = useRouter()
  const { devices, stats, isLoading, fetchDevices, fetchStats } = useDevices()

  useEffect(() => {
    fetchDevices()
    fetchStats()
  }, [fetchDevices, fetchStats])

  const getStatusBadge = (status: DeviceStatus) => {
    const variants: Record<DeviceStatus, "default" | "success" | "destructive" | "secondary"> = {
      ACTIVE: "success",
      INACTIVE: "destructive",
      PENDING: "default",
      DECOMMISSIONED: "secondary"
    }
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  const DevicesColumns: ColumnDef<Device>[] = [
    {
      accessorKey: 'name',
      header: t('columns.name'),
      cell: ({row}) => row.original.name
    },
    {
      accessorKey: 'ipAddress',
      header: t('columns.ipAddress'),
      cell: ({row}) => row.original.ipAddress
    },

    {
      accessorKey: 'status',
      header: t('columns.status'),
      cell: ({row}) => getStatusBadge(row.original.status)
    },

    {
      accessorKey: 'tag',
      header: t('columns.tag'),
      cell: ({row}) => row.original.deviceTag
    },
    {
      accessorKey: 'actions',
      header: t('columns.actions'),
      cell: ({row}) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='size-8 p-0' >
              <MoreHorizontal className='size-4'/>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent side='left' className='min-w-[32px] flex flex-col p-1 gap-1'>
              <Button 
                variant='ghost' 
                size="icon"
                onClick={() => console.log('Edit', row.original.id)}
                className='size-8 w-full'
              >
                <Pencil className='size-4'/>
              </Button>

              <Button 
                variant='ghost' 
                size="icon"
                onClick={() => console.log('RenewIP', row.original.id)}
                className='size-8 text-blue-500 w-full'
              >
                <RefreshCw className='size-4'/>
              </Button>

              <Button 
                variant='ghost' 
                size="icon"
                onClick={() => console.log('Delete', row.original.id)}
                className='size-8 w-full text-destructive'
              >
                <Trash className='size-4'/>
              </Button>
            </DropdownMenuContent>

        </DropdownMenu>
      )
    }
  ]  
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
            columns={DevicesColumns} 
            data={testDevices}
            onRowClick={(row) => router.push(`/devices/${row.id}`)}
            rowClassName="cursor-pointer hover:bg-muted/50"
          />
        )}
    </div>
  </div>
}