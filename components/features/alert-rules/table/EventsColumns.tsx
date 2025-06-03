'use client'

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Event } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdowmmenu"

export function createEventsColumns(t: (key: string) => string): ColumnDef<Event>[] {
    return [
        {
            accessorKey: 'title',
            header: ({column}) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-center"
                    >
                        {t('table.columns.title')}
                        <ArrowUpDown className='ml-2 h-4 w-4' />
                    </Button>
                )
            },
            cell: ({row}) => {
                return (
                    <div className="text-center w-full font-medium">
                        {row.original.title}
                    </div>
                )
            }
        },
        {
            accessorKey: 'type',
            header: ({column}) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-center"
                    >
                        {t('table.columns.type')}
                        <ArrowUpDown className='ml-2 h-4 w-4' />
                    </Button>
                )
            },
            cell: ({row}) => {
                const type = row.original.type
                return (
                    <div className="text-center w-full">
                        <Badge variant="outline">
                        {t(`eventTypes.${type.toLowerCase()}`)}
                        </Badge>
                    </div>
                )
            }
        },
        {
            accessorKey: 'severity',
            header: ({column}) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-center"
                    >
                        {t('table.columns.severity')}
                        <ArrowUpDown className='ml-2 h-4 w-4' />
                    </Button>
                )
            },
            cell: ({row}) => {
                const severity = row.original.severity
                const severityColors = {
                    LOW: 'bg-green-100 text-green-800',
                    MEDIUM: 'bg-yellow-100 text-yellow-800',
                    HIGH: 'bg-orange-100 text-orange-800',
                    CRITICAL: 'bg-red-100 text-red-800'
                }
                return (
                    <div className="text-center w-full">
                        <Badge className={severityColors[severity as keyof typeof severityColors]}>
                        {t(`severities.${severity.toLowerCase()}`)}
                        </Badge>
                    </div>
                )
            }
        },
        {
            accessorKey: 'isRead',
            header: ({column}) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-center"
                    >
                        {t('table.columns.status')}
                        <ArrowUpDown className='ml-2 h-4 w-4' />
                    </Button>
                )
            },
            cell: ({row}) => {
                const isRead = row.original.isRead
                return (
                    <div className="text-center w-full">
                        <Badge variant={isRead ? "secondary" : "default"}>
                        {isRead ? t('status.read') : t('status.unread')}
                        </Badge>
                    </div>
                )
            }
        },
        {
            accessorKey: 'createdAt',
            header: ({column}) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-center"
                    >
                        {t('table.columns.createdAt')}
                        <ArrowUpDown className='ml-2 h-4 w-4' />
                    </Button>
                )
            },
            cell: ({row}) => {
                return (
                    <div className="text-center w-full text-sm">
                        {new Date(row.original.createdAt).toLocaleString()}
                    </div>
                )
            }
        },
        {
            id: 'actions',
            header: () => <div className="text-center">{t('table.columns.actions')}</div>,
            cell: ({row}) => {
                return (
                    <div className="text-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Открыть меню</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => console.log('Mark as read', row.original.id)}>
                                    {t('actions.markAsRead')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => console.log('Delete', row.original.id)}>
                                    {t('actions.delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            }
        }
    ]
}