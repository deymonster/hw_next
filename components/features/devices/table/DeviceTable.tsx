'use client'

import { useDevices } from "@/hooks/useDevices";

import type { Device } from "@prisma/client"
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation"

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

import { DataTable } from "@/components/ui/elements/DataTable";
import { useEffect, useMemo } from "react";
import { createDeviceColumns } from "./DeviceColumns";


export function DevicesTable() {
  const t = useTranslations('dashboard.devices')
  const router = useRouter()
  const { isLoading, fetchDevices, fetchStats, devices } = useDevices()

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
            data={devices}
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
}