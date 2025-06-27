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
                const duration = row.original.duration
                return (
                    <div className="text-center w-full font-mono text-xs hidden md:block">
                        <div className="truncate max-w-[120px]" title={metric}>
                            {metric}
                        </div>
                        {threshold !== null && threshold !== undefined && (
                            <div className="text-gray-500 text-xs">
                                {operator && t(`operators.${operator.toLowerCase()}`)} {threshold} {t('for')} {duration}
                            </div>
                        )}
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
        }
    ]
}