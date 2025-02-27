'use client'

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/elements/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { createScanDeviceColumns } from "./ScanDeviceColumns";


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
    <div className='mt-5 lg:px-10'>
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