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
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  
  const columns = useMemo(()=> createScanDeviceColumns((key: string) => t(key)), [t])

  const handleSelectionChange: OnChangeFn<RowSelectionState> = (updaterOrValue) => {
    console.log('[SCAN_TABLE] Selection change:', updaterOrValue)
    
    // Get new selection value by applying updater to current state
    const newSelection = typeof updaterOrValue === 'function' 
      ? updaterOrValue(rowSelection)
      : updaterOrValue
    
    console.log('[SCAN_TABLE] Current selection:', rowSelection)
    console.log('[SCAN_TABLE] New selection:', newSelection)
    
    // Update local selection state
    setRowSelection(newSelection)
    
    // Convert all selected rows to array of IP addresses
    const selectedIps = Object.entries(newSelection)
      .filter(([_, selected]) => selected)
      .map(([index]) => data[parseInt(index)].ipAddress)

    console.log('[SCAN_TABLE] All selected IPs:', selectedIps)
    
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
            rowSelection={rowSelection}
        />
    </div>
  )
}