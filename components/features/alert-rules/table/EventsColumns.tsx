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
                        className="w-full justify-center text-xs h-8 px-1"
                    >
                        {t('table.columns.title')}
                        <ArrowUpDown className='ml-1 h-3 w-3' />
                    </Button>
                )
            },
            cell: ({row}) => {
                return (
                    <div className="text-center w-full font-medium text-xs sm:text-sm px-1">
                        <div className="truncate max-w-[150px] sm:max-w-[200px]" title={row.original.title}>
                            {row.original.title}
                        </div>
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
                        className="w-full justify-center text-xs h-8 hidden sm:flex"
                    >
                        {t('table.columns.type')}
                        <ArrowUpDown className='ml-1 h-3 w-3' />
                    </Button>
                )
            },
            cell: ({row}) => {
                const type = row.original.type
                return (
                    <div className="text-center w-full hidden sm:block">
                        <Badge variant="outline" className="text-xs px-1 py-0">
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
                        className="w-full justify-center text-xs h-8 px-1"
                    >
                        <span className="sm:hidden">{t('table.columns.severity')}</span>
                        <ArrowUpDown className='ml-1 h-3 w-3' />
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
                        <Badge className={`text-xs px-1 py-0 ${severityColors[severity as keyof typeof severityColors]}`}>
                        <span className="hidden sm:inline">{t(`severities.${severity.toLowerCase()}`)}</span>
                        <span className="sm:hidden">
                            {severity === 'HIGH' ? 'Высок' : 
                             severity === 'MEDIUM' ? 'Сред' : 
                             severity === 'LOW' ? 'Низк' : 
                             severity === 'CRITICAL' ? 'Крит' : severity}
                        </span>
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
                        className="w-full justify-center text-xs h-8 px-1"
                    >
                        <span className="hidden sm:inline">{t('table.columns.status')}</span>
                        <span className="sm:hidden">{t('table.columns.status')}</span>
                        <ArrowUpDown className='ml-1 h-3 w-3' />
                    </Button>
                )
            },
            cell: ({row}) => {
                const isRead = row.original.isRead
                return (
                    <div className="text-center w-full">
                        <Badge variant={isRead ? "secondary" : "default"} className="text-xs px-1 py-0">
                        <span className="hidden sm:inline">{isRead ? t('status.read') : t('status.unread')}</span>
                        <span className="sm:hidden">{isRead ? '✓' : '●'}</span>
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
                        className="w-full justify-center text-xs h-8 px-1 hidden md:flex"
                    >
                        {t('table.columns.createdAt')}
                        <ArrowUpDown className='ml-1 h-3 w-3' />
                    </Button>
                )
            },
            cell: ({row}) => {
                const date = new Date(row.original.createdAt)
                return (
                    <div className="text-center w-full text-xs hidden md:block">
                        <div>
                            {date.toLocaleDateString('ru-RU', { 
                                day: '2-digit', 
                                month: '2-digit'
                            })}
                        </div>
                        <div className="text-gray-500">
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
            header: () => <div className="text-center text-xs">{t('table.columns.actions')}</div>,
            cell: ({row}) => {
                return (
                    <div className="text-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-6 w-6 p-0">
                                    <span className="sr-only">Открыть меню</span>
                                    <MoreHorizontal className="h-3 w-3" />
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