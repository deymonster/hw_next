import { Department, Device, Employee } from '@prisma/client'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'

type EmployeeWithRelations = Employee & {
	department?: Department | null
	devices?: Device[]
}

export function createEmployeeColumns(
	t: (key: string) => string
): ColumnDef<Employee>[] {
	const columns: ColumnDef<EmployeeWithRelations>[] = [
		{
			accessorKey: 'fullName',
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						onClick={() =>
							column.toggleSorting(column.getIsSorted() === 'asc')
						}
						className='w-full justify-center'
					>
						{t('table.columns.fullName')}
						<ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				)
			},
			cell: ({ row }) => (
				<div className='w-full text-center'>
					{`${row.original.firstName} ${row.original.lastName}`}
				</div>
			),
			filterFn: (row, columnId, filterValue) => {
				const fullName =
					`${row.original.firstName} ${row.original.lastName}`.toLowerCase()
				return fullName.includes(filterValue.toLowerCase())
			}
		},

		{
			accessorKey: 'department',
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						onClick={() =>
							column.toggleSorting(column.getIsSorted() === 'asc')
						}
						className='w-full justify-center'
					>
						{t('table.columns.department')}
						<ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				)
			},
			cell: ({ row }) => (
				<div className='w-full text-center'>
					{row.original.department?.name || t('noDepartment')}
				</div>
			)
		},
		{
			accessorKey: 'devices',
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						onClick={() =>
							column.toggleSorting(column.getIsSorted() === 'asc')
						}
						className='w-full justify-center'
					>
						{t('table.columns.devicesCount')}
						<ArrowUpDown className='ml-2 h-4 w-4' />
					</Button>
				)
			},
			cell: ({ row }) => (
				<div className='w-full text-center'>
					{row.original.devices?.length || 0}
				</div>
			)
		}
	]
	return columns
}
