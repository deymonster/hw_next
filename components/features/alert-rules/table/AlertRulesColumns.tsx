'use client'

import { AlertRule } from '@prisma/client'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function createAlertRulesColumns(
	t: (key: string, options?: { fallback?: string }) => string
): ColumnDef<AlertRule>[] {
	return [
		{
			accessorKey: 'name',
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						onClick={() =>
							column.toggleSorting(column.getIsSorted() === 'asc')
						}
						className='w-full justify-center text-xs'
					>
						{t('table.columns.name')}
						<ArrowUpDown className='ml-1 h-4 w-3' />
					</Button>
				)
			},
			cell: ({ row }) => {
				return (
					<div className='w-full text-center text-sm font-medium'>
						{row.original.name}
					</div>
				)
			}
		},

		{
			accessorKey: 'metric',
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						onClick={() =>
							column.toggleSorting(column.getIsSorted() === 'asc')
						}
						className='hidden w-full justify-center text-xs md:flex'
					>
						{t('table.columns.metric')}
						<ArrowUpDown className='ml-1 h-3 w-3' />
					</Button>
				)
			},
			cell: ({ row }) => {
				const threshold = row.original.threshold
				const operator = row.original.operator
				const metric = row.original.metric
				const duration = row.original.duration

				const friendlyMetricName = t(`metrics.${metric}`, {
					fallback: metric
				})
				return (
					<div className='hidden w-full text-center font-mono text-xs md:block'>
						<div className='max-w-[200px] truncate' title={metric}>
							{friendlyMetricName}
						</div>
						{threshold !== null && threshold !== undefined && (
							<div className='text-xs text-gray-500'>
								{operator &&
									t(
										`operators.${operator.toLowerCase()}`
									)}{' '}
								{threshold} {t('for')} {duration}
							</div>
						)}
					</div>
				)
			}
		},
		{
			accessorKey: 'severity',
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						onClick={() =>
							column.toggleSorting(column.getIsSorted() === 'asc')
						}
						className='w-full justify-center text-xs'
					>
						{t('table.columns.severity')}
						<ArrowUpDown className='ml-1 h-3 w-3' />
					</Button>
				)
			},
			cell: ({ row }) => {
				const severity = row.original.severity
				const severityColors = {
					INFO: 'bg-blue-100 text-blue-800',
					WARNING: 'bg-yellow-100 text-yellow-800',
					CRITICAL: 'bg-red-100 text-red-800'
				}
				return (
					<div className='w-full text-center'>
						<Badge
							className={`px-1 py-0 text-xs ${severityColors[severity as keyof typeof severityColors]}`}
						>
							{t(`severities.${severity.toLowerCase()}`)}
						</Badge>
					</div>
				)
			}
		},
		{
			accessorKey: 'enabled',
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						onClick={() =>
							column.toggleSorting(column.getIsSorted() === 'asc')
						}
						className='w-full justify-center text-xs'
					>
						{t('table.columns.status')}
						<ArrowUpDown className='ml-1 h-3 w-3' />
					</Button>
				)
			},
			cell: ({ row }) => {
				const enabled = row.original.enabled
				return (
					<div className='w-full text-center'>
						<Badge
							variant={enabled ? 'default' : 'secondary'}
							className='px-1 py-0 text-xs'
						>
							{enabled
								? t('status.active')
								: t('status.inactive')}
						</Badge>
					</div>
				)
			}
		}
	]
}
