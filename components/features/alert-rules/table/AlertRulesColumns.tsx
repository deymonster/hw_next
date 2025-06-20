'use client'

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { AlertRule } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdowmmenu"

export function createAlertRulesColumns(t: (key: string) => string): ColumnDef<AlertRule>[] {
    return [
        {
            accessorKey: 'name',
            header: ({column}) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-center text-xs"
                    >
                        {t('table.columns.name')}
                        <ArrowUpDown className='ml-1 h-4 w-3' />
                    </Button>
                )
            },
            cell: ({row}) => {
                return (
                    <div className="text-center w-full font-medium text-sm">
                        {row.original.name}
                    </div>
                )
            }
        },
        {
            accessorKey: 'category',
            header: ({column}) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-center text-xs hidden sm:flex"
                    >
                        {t('table.columns.category')}
                        <ArrowUpDown className='ml-1 h-3 w-3' />
                    </Button>
                )
            },
            cell: ({row}) => {
                const category = row.original.category
                return (
                    <div className="text-center w-full hidden sm:block">
                        <Badge variant="outline">
                        {t(`categories.${category.toLowerCase()}`)}
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
                        className="w-full justify-center text-xs"
                    >
                        {t('table.columns.severity')}
                        <ArrowUpDown className='ml-1 h-3 w-3' />
                    </Button>
                )
            },
            cell: ({row}) => {
                const severity = row.original.severity
                const severityColors = {
                    INFO: 'bg-blue-100 text-blue-800',
                    WARNING: 'bg-yellow-100 text-yellow-800',
                    CRITICAL: 'bg-red-100 text-red-800'
                }
                return (
                    <div className="text-center w-full">
                        <Badge className={`text-xs px-1 py-0 ${severityColors[severity as keyof typeof severityColors]}`}>
                        {t(`severities.${severity.toLowerCase()}`)}
                        </Badge>
                    </div>
                )
            }
        },
        {
            accessorKey: 'enabled',
            header: ({column}) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-center text-xs"
                    >
                        {t('table.columns.status')}
                        <ArrowUpDown className='ml-1 h-3 w-3' />
                    </Button>
                )
            },
            cell: ({row}) => {
                const enabled = row.original.enabled
                return (
                    <div className="text-center w-full">
                        <Badge variant={enabled ? "default" : "secondary"} className="text-xs px-1 py-0">
                            {enabled ? t('status.active') : t('status.inactive')}
                        </Badge>
                    </div>
                )
            }
        },
        {
            accessorKey: 'metric',
            header: ({column}) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-center text-xs hidden md:flex"
                    >
                        {t('table.columns.metric')}
                        <ArrowUpDown className='ml-1 h-3 w-3' />
                    </Button>
                )
            },
            cell: ({row}) => {
                const threshold = row.original.threshold
                const operator = row.original.operator
                const metric = row.original.metric
                return (
                    <div className="text-center w-full font-mono text-xs hidden md:block">
                        <div className="truncate max-w-[120px]" title={metric}>
                            {metric}
                        </div>
                        {threshold !== null && threshold !== undefined && (
                            <div className="text-gray-500 text-xs">
                                {operator && t(`operators.${operator.toLowerCase()}`)} {threshold}
                            </div>
                        )}
                    </div>
                )
            }
        },
        // {
        //     accessorKey: 'threshold',
        //     header: ({column}) => {
        //         return (
        //             <Button
        //                 variant='ghost'
        //                 onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        //                 className="w-full justify-center"
        //             >
        //                 {t('table.columns.threshold')}
        //                 <ArrowUpDown className='ml-2 h-4 w-4' />
        //             </Button>
        //         )
        //     },
        //     cell: ({row}) => {
        //         const threshold = row.original.threshold
        //         const operator = row.original.operator
        //         return (
        //             <div className="text-center w-full">
        //                 {threshold !== null && threshold !== undefined ? (
        //                     <span className="font-mono text-sm">
        //                         {operator && t(`operators.${operator.toLowerCase()}`)} {threshold}
        //                     </span>
        //                 ) : (
        //                     <span className="text-gray-400">-</span>
        //                 )}
        //             </div>
        //         )
        //     }
        // },
        {
            accessorKey: 'duration',
            header: ({column}) => {
                return (
                    <Button
                        variant='ghost'
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="w-full justify-center text-xs hidden lg:flex"
                    >
                        {t('table.columns.duration')}
                        <ArrowUpDown className='ml-1 h-3 w-3' />
                    </Button>
                )
            },
            cell: ({row}) => {
                return (
                    <div className="text-center w-full font-mono text-xs hidden lg:block">
                        {row.original.duration}
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
                        className="w-full justify-center text-xs hidden xl:flex"
                    >
                        {t('table.columns.createdAt')}
                        <ArrowUpDown className='ml-1 h-3 w-3' />
                    </Button>
                )
            },
            cell: ({row}) => {
                const date = new Date(row.original.createdAt)
                return (
                    <div className="text-center w-full text-xs text-gray-600 hidden xl:block">
                        {date.toLocaleDateString('ru-RU', { 
                            day: '2-digit', 
                            month: '2-digit',
                            year: '2-digit'
                        })}
                    </div>
                )
            }
        },
        {
            id: "actions",
            header: () => <div className="text-center text-xs">{t('table.columns.actions')}</div>,
            cell: ({ row }) => {
                const rule = row.original
                
                return (
                    <div className="text-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-6 w-6 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => console.log('View', rule.id)}>
                                    {t('actions.view')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => console.log('Edit', rule.id)}>
                                    {t('actions.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => console.log('Toggle', rule.id)}>
                                    {rule.enabled ? t('actions.disable') : t('actions.enable')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => console.log('Duplicate', rule.id)}>
                                    {t('actions.duplicate')}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => console.log('Delete', rule.id)}
                                    className="text-red-600"
                                >
                                    {t('actions.delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]
}