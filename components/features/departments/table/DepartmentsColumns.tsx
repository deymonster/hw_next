import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { DepartmentWithDeviceCount } from "@/hooks/useDepartment"

export function createDepartmentColumns(t: (key: string) => string): ColumnDef<DepartmentWithDeviceCount>[] {
    const columns: ColumnDef<DepartmentWithDeviceCount>[] = [
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
            accessorKey: 'deviceCount',
            header: ({column}) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        {t('columns.deviceCount')}
                        <ArrowUpDown className='ml-2 h-4 w-4' />
                    </Button>
                )
            },
            cell: ({row}) => {
                return (
                    <Badge variant="secondary">
                        {row.original.deviceCount || 0}
                    </Badge>
                )
            }
        }
    
    ]
    return columns
}