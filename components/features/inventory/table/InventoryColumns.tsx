'use client'

import { Button } from "@/components/ui/button"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { InventoryWithRelations } from "@/hooks/useInventory"


interface InventoryData {
    id: string
    createdAt: Date
    user: {
        name: string
    }
    items: any[]
    departments: {
        name: string
    }[]
}

export function createInventoryColumns(t: (key: string) => string): ColumnDef<InventoryWithRelations>[] {
    return [
        {
            accessorKey: 'createdAt',
            header: ({ column }) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-start"
                    >
                        {t('table.columns.date')}
                        <ArrowUpDown className='ml-2 h-4 w-4' />
                    </Button>
                )
            },
            cell: ({ row }) => format(new Date(row.original.createdAt), 'dd MMMM yyyy', { locale: ru })
        },
        {
            accessorKey: 'user.name',
            header: ({ column }) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-start"
                    >
                        {t('table.columns.createdBy')}
                        <ArrowUpDown className='ml-2 h-4 w-4' />
                    </Button>
                )
            }
        },
        {
            id: 'devicesCount',
            header: ({ column }) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-start"
                    >
                        {t('table.columns.devicesCount')}
                        <ArrowUpDown className='ml-2 h-4 w-4' />
                    </Button>
                )
            },
            cell: ({ row }) => row.original.items?.length
        },
        {
            accessorKey: 'departments',
            header: t('table.columns.departments'),
            cell: ({ row }) => row.original.departments?.map(dept => dept.name).join(', ')
        }
    ]
}