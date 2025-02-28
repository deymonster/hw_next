'use client'

import { DataTable } from "@/components/ui/elements/DataTable";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { createScanDeviceColumns } from "./ScanDeviceColumns";
import { useDevices } from "@/hooks/useDevices";


interface ScanDevice {
    ipAddress: string
    agentKey: string
    isRegistered: boolean
}

interface ScanTableProps {
    data: ScanDevice[]
    isLoading?: boolean
    onRowSelectionChange?: (selectedRows: string[]) => void
}

export function ScanTable({data, isLoading, onRowSelectionChange }: ScanTableProps) {
  const t = useTranslations('dashboard.devices.scanModal')
  
  const columns = useMemo(()=> createScanDeviceColumns((key: string) => t(key)), [t])


  return (
    <div>
        <DataTable
            columns={columns}
            data={data}
            pagination={{
                enabled: true,
                pageSize: 5,
                showPageSize: false
            }}
        />

    </div>
        
    
  )
  
}