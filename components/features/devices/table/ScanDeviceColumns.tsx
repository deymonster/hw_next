'use client'

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"


export type ScanDevice = {
    ipAddress: string
    agentKey: string
    isRegistered: boolean
}

type TranslationFunction = (key: string) => string

export const createScanDeviceColumns = (t: TranslationFunction): ColumnDef<ScanDevice>[] => [
    {
        accessorKey: 'ipAddress',
        header: 'IP Address',
        cell: ({ row }) => row.original.ipAddress
    },
    {
        accessorKey: 'agentKey',
        header: 'Agent Key',
        cell: ({ row }) => row.original.agentKey || '-'
    },
    {
        accessorKey: 'isRegistered',
        header: 'Status',
        cell: ({ row }) => (
            <Badge variant={row.original.isRegistered ? "destructive" : "secondary"}>
                {row.original.isRegistered ? t('status.registered') : t('status.new')}
            </Badge>
        )
    }
]