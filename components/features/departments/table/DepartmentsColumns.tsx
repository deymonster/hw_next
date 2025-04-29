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
                        className="w-full justify-center"
                    >
                        {t('columns.name')}
                        <ArrowUpDown className='ml-2 h-4 w-4' />
                    </Button>
                )
            },
            cell: ({row}) => {
                return (
                    <div className="text-center w-full">
                        {row.original.name}
                    </div>
                )
            }
        },
        
        {
            accessorKey: 'deviceCount',
            header: ({column}) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-center"
                    >
                        {t('columns.deviceCount')}
                        <ArrowUpDown className='ml-2 h-4 w-4' />
                    </Button>
                )
            },
            cell: ({row}) => {
                return (
                    <div className="text-center w-full">
                        <Badge variant="secondary">
                            {row.original.deviceCount || 0}
                        </Badge>
                    </div>
                    
                )
            }
        },

        {
            accessorKey: 'employeesCount',
            header: ({column}) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-center"
                    >
                        {t('columns.employeesCount')}
                        <ArrowUpDown className='ml-2 h-4 w-4' />
                    </Button>
                )
            },
            cell: ({row}) => {
                return (
                    <div className="text-center w-full">
                        <Badge variant="secondary">
                            {row.original.employeesCount || 0}
                        </Badge>
                    </div>
                )
            }
        }
    
    ]
    return columns
}