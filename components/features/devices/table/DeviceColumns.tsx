'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdowmmenu"
import { SelectFilter } from "@/components/ui/elements/Select-filter"
import { Device, DeviceStatus } from "@prisma/client"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, RefreshCw, Trash } from "lucide-react"
import { ArrowUpDown } from "lucide-react"
import { DeviceActions } from "./DeviceActions"

type TranslationFunction = (key: string) => string

const statusTranslations: Record<DeviceStatus, string> = {
    ACTIVE: 'В СЕТИ',
    INACTIVE: 'НЕ В СЕТИ',
    PENDING: 'ОЖИДАНИЕ',
    DECOMMISSIONED: 'ВЫВЕДЕН'
  }


const getStatusBadge = (status: DeviceStatus) => {
    const variants: Record<DeviceStatus, "default" | "success" | "destructive" | "secondary"> = {
      ACTIVE: "success",
      INACTIVE: "destructive",
      PENDING: "default",
      DECOMMISSIONED: "secondary"
    }
    return <Badge variant={variants[status]}>{statusTranslations[status]}</Badge>
  }

export const createDeviceColumns = (t: TranslationFunction): ColumnDef<Device>[] => [
    {
      accessorKey: 'name',
      header: ({column}) => {
        return (
            <Button 
                variant='ghost'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                {t('columns.name')}
                <ArrowUpDown className='ml-2 h-4 w-4' />
            </Button>
        )
      },
      cell: ({row}) => row.original.name
    },
    {
      accessorKey: 'ipAddress',
      header: ({column}) => {
        return (
            <Button 
                variant='ghost'
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                {t('columns.ipAddress')}
                <ArrowUpDown className='ml-2 h-4 w-4' />
            </Button>
        )
      },
      cell: ({row}) => row.original.ipAddress
    },

    {
      accessorKey: 'status',
      header: ({column}) => (
        <div className='space-y-2'>

            <SelectFilter
                    options={Object.values(DeviceStatus)}
                    selectedValue={column.getFilterValue() as string}
                    onValueChange={(value) => column.setFilterValue(value)}
                    placeholder={t('columns.status')} 
                    translateOption={(option) => statusTranslations[option as DeviceStatus] || option}
            /> 

        </div>
        
      ),
      cell: ({row}) => getStatusBadge(row.original.status),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const status = row.getValue(columnId) as DeviceStatus;
        return status === filterValue;
      }
      
    },

    {
        accessorKey: 'deviceTag',
        header: t('columns.tag'),
        cell: ({row}) => row.original.deviceTag,
        filterFn: (row, columnId, filterValue) => {
          const value = row.getValue(columnId) as string;
          return value.toLowerCase().startsWith(filterValue.toLowerCase()); 
        }
    },

    {
        id: 'actions',
        cell: ({row}) => <DeviceActions device={row.original} />
    }
  ]