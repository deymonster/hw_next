import { Button } from "@/components/ui/button"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { DepartmentWithCounts } from "@/hooks/useDepartment"

export function createDepartmentColumns(t: (key: string) => string): ColumnDef<DepartmentWithCounts>[] {
    const columns: ColumnDef<DepartmentWithCounts>[] = [
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
                            {row.original.deviceCount || 0}
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
                            {row.original.employeesCount || 0}
                    </div>
                )
            }
        }
    
    ]
    return columns
}