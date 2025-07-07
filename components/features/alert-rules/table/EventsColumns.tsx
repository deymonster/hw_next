'use client'

import { Event } from '@prisma/client'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdowmmenu'

export function createEventsColumns(
	t: (key: string) => string,
	onMarkAsRead: (eventId: string) => void
): ColumnDef<Event>[] {
	return [
		{
			accessorKey: 'title',
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						onClick={() =>
							column.toggleSorting(column.getIsSorted() === 'asc')
						}
						className='h-8 w-full justify-center px-1 text-xs'
					>
						{t('table.columns.title')}
						<ArrowUpDown className='ml-1 h-3 w-3' />
					</Button>
				)
			},
			cell: ({ row }) => {
				return (
					<div className='w-full px-1 text-center text-xs font-medium sm:text-sm'>
						<div
							className='max-w-[150px] truncate sm:max-w-[200px]'
							title={row.original.title}
						>
							{row.original.title}
						</div>
					</div>
				)
			}
		},
		{
			accessorKey: 'type',
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						onClick={() =>
							column.toggleSorting(column.getIsSorted() === 'asc')
						}
						className='hidden h-8 w-full justify-center text-xs sm:flex'
					>
						{t('table.columns.type')}
						<ArrowUpDown className='ml-1 h-3 w-3' />
					</Button>
				)
			},
			cell: ({ row }) => {
				const type = row.original.type
				return (
					<div className='hidden w-full text-center sm:block'>
						<Badge variant='outline' className='px-1 py-0 text-xs'>
							{t(`eventTypes.${type.toLowerCase()}`)}
						</Badge>
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
						className='h-8 w-full justify-center px-1 text-xs'
					>
						<span className='sm:hidden'>
							{t('table.columns.severity')}
						</span>
						<ArrowUpDown className='ml-1 h-3 w-3' />
					</Button>
				)
			},
			cell: ({ row }) => {
				const severity = row.original.severity
				const severityColors = {
					LOW: 'bg-green-100 text-green-800',
					MEDIUM: 'bg-yellow-100 text-yellow-800',
					HIGH: 'bg-orange-100 text-orange-800',
					CRITICAL: 'bg-red-100 text-red-800'
				}
				return (
					<div className='w-full text-center'>
						<Badge
							className={`px-1 py-0 text-xs ${severityColors[severity as keyof typeof severityColors]}`}
						>
							<span className='hidden sm:inline'>
								{t(`severities.${severity.toLowerCase()}`)}
							</span>
							<span className='sm:hidden'>
								{severity === 'HIGH'
									? 'Высок'
									: severity === 'MEDIUM'
										? 'Сред'
										: severity === 'LOW'
											? 'Низк'
											: severity === 'CRITICAL'
												? 'Крит'
												: severity}
							</span>
						</Badge>
					</div>
				)
			}
		},
		{
			accessorKey: 'isRead',
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						onClick={() =>
							column.toggleSorting(column.getIsSorted() === 'asc')
						}
						className='h-8 w-full justify-center px-1 text-xs'
					>
						<span className='hidden sm:inline'>
							{t('table.columns.status')}
						</span>
						<span className='sm:hidden'>
							{t('table.columns.status')}
						</span>
						<ArrowUpDown className='ml-1 h-3 w-3' />
					</Button>
				)
			},
			cell: ({ row }) => {
				const isRead = row.original.isRead
				return (
					<div className='w-full text-center'>
						<Badge
							variant={isRead ? 'secondary' : 'default'}
							className='px-1 py-0 text-xs'
						>
							<span className='hidden sm:inline'>
								{isRead ? t('status.read') : t('status.unread')}
							</span>
							<span className='sm:hidden'>
								{isRead ? '✓' : '●'}
							</span>
						</Badge>
					</div>
				)
			}
		},
		{
			accessorKey: 'createdAt',
			header: ({ column }) => {
				return (
					<Button
						variant='ghost'
						onClick={() =>
							column.toggleSorting(column.getIsSorted() === 'asc')
						}
						className='hidden h-8 w-full justify-center px-1 text-xs md:flex'
					>
						{t('table.columns.createdAt')}
						<ArrowUpDown className='ml-1 h-3 w-3' />
					</Button>
				)
			},
			cell: ({ row }) => {
				const date = new Date(row.original.createdAt)
				return (
					<div className='hidden w-full text-center text-xs md:block'>
						<div>
							{date.toLocaleDateString('ru-RU', {
								day: '2-digit',
								month: '2-digit'
							})}
						</div>
						<div className='text-gray-500'>
							{date.toLocaleTimeString('ru-RU', {
								hour: '2-digit',
								minute: '2-digit'
							})}
						</div>
					</div>
				)
			}
		},
		{
			id: 'actions',
			header: () => (
				<div className='text-center text-xs'>
					{t('table.columns.actions')}
				</div>
			),
			cell: ({ row }) => {
				return (
					<div className='text-center'>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant='ghost' className='h-6 w-6 p-0'>
									<span className='sr-only'>
										Открыть меню
									</span>
									<MoreHorizontal className='h-3 w-3' />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align='end'>
								<DropdownMenuItem
									onClick={() =>
										onMarkAsRead(row.original.id)
									}
								>
									{t('actions.markAsRead')}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)
			}
		}
	]
}
