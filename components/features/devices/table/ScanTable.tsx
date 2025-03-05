'use client'

import { DataTable } from "@/components/ui/elements/DataTable";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { createScanDeviceColumns } from "./ScanDeviceColumns";
import { OnChangeFn, RowSelectionState } from "@tanstack/react-table";


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

  const handleSelectionChange: OnChangeFn<RowSelectionState> = (updaterOrValue) => {
    const value = typeof updaterOrValue === 'function' 
      ? updaterOrValue({}) 
      : updaterOrValue
    
    const selectedIps = Object.entries(value)
      .filter(([_, selected]) => selected)
      .map(([index]) => data[parseInt(index)].ipAddress)

    onRowSelectionChange?.(selectedIps)
  }
  
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
            enableRowSelection={true}
            onRowSelectionChange={handleSelectionChange}
            
        />

    </div>
        
    
  )
  
}