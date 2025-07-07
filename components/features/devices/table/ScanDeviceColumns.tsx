'use client'

import { ColumnDef } from '@tanstack/react-table'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

export type ScanDevice = {
	ipAddress: string
	agentKey: string
	isRegistered: boolean
}

type TranslationFunction = (key: string) => string

export const createScanDeviceColumns = (
	t: TranslationFunction
): ColumnDef<ScanDevice>[] => [
	{
		id: 'select',
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && 'indeterminate')
				}
				onCheckedChange={value =>
					table.toggleAllPageRowsSelected(!!value)
				}
				aria-label='Select all'
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={value => row.toggleSelected(!!value)}
				aria-label='Select row'
			/>
		),
		enableSorting: false,
		enableHiding: false
	},

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
			<Badge
				variant={
					row.original.isRegistered ? 'destructive' : 'secondary'
				}
			>
				{row.original.isRegistered
					? t('status.registered')
					: t('status.new')}
			</Badge>
		)
	}
]
