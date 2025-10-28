import { Device, Employee } from '@prisma/client'
import { Loader2, WifiOff, Wifi, User2 } from 'lucide-react'
import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
        Table,
        TableBody,
        TableCell,
        TableHead,
        TableHeader,
        TableRow
} from '@/components/ui/table'

interface DepartmentDevice extends Device {
        onlineStatus?: {
                isOnline: boolean
                lastSeen: Date | null
        } | null
}

interface DepartmentDevicesTabProps {
        devices: DepartmentDevice[]
        employees: Employee[]
        isLoading: boolean
        onAssignClick: () => void
}

export function DepartmentDevicesTab({
        devices,
        employees,
        isLoading,
        onAssignClick
}: DepartmentDevicesTabProps) {
        const employeeMap = useMemo(
                () => new Map(employees.map(employee => [employee.id, employee])),
                [employees]
        )

        if (isLoading) {
                return (
                        <div className='flex items-center justify-center py-12 text-muted-foreground'>
                                <Loader2 className='mr-2 h-5 w-5 animate-spin' /> Загрузка устройств...
                        </div>
                )
        }

        if (!devices.length) {
                return (
                        <div className='flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground'>
                                <p>У этого отдела пока нет назначенных устройств.</p>
                                <Button onClick={onAssignClick}>Назначить устройства</Button>
                        </div>
                )
        }

        return (
                <div className='space-y-4'>
                        <div className='flex justify-end'>
                                <Button onClick={onAssignClick}>Назначить устройства</Button>
                        </div>
                        <div className='overflow-x-auto rounded-lg border'>
                                <Table>
                                        <TableHeader>
                                                <TableRow>
                                                        <TableHead>Устройство</TableHead>
                                                        <TableHead>Сотрудник</TableHead>
                                                        <TableHead>Статус</TableHead>
                                                        <TableHead className='hidden sm:table-cell'>Последнее обновление</TableHead>
                                                </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                                {devices.map(device => {
                                                        const assignedEmployee =
                                                                device.employeeId && employeeMap.get(device.employeeId)
                                                        const status = device.onlineStatus
                                                        const lastSeen =
                                                                status?.lastSeen
                                                                        ? new Date(status.lastSeen)
                                                                        : null

                                                        return (
                                                                <TableRow key={device.id}>
                                                                        <TableCell>
                                                                                <div>
                                                                                        <div className='font-medium'>{device.name}</div>
                                                                                        <div className='text-xs text-muted-foreground'>
                                                                                                {device.ipAddress}
                                                                                        </div>
                                                                                </div>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                                {assignedEmployee ? (
                                                                                        <div className='flex items-center gap-2'>
                                                                                                <User2 className='h-4 w-4 text-muted-foreground' />
                                                                                                <span className='text-sm'>
                                                                                                        {[assignedEmployee.firstName, assignedEmployee.lastName]
                                                                                                                .filter(Boolean)
                                                                                                                .join(' ') ||
                                                                                                                assignedEmployee.email ||
                                                                                                                'Без имени'
                                                                                                        }
                                                                                                </span>
                                                                                        </div>
                                                                                ) : (
                                                                                        <Badge variant='outline'>Не назначено</Badge>
                                                                                )}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                                {status ? (
                                                                                        <Badge variant={status.isOnline ? 'default' : 'secondary'}>
                                                                                                {status.isOnline ? (
                                                                                                        <span className='flex items-center gap-1'>
                                                                                                                <Wifi className='h-4 w-4' /> В сети
                                                                                                        </span>
                                                                                                ) : (
                                                                                                        <span className='flex items-center gap-1'>
                                                                                                                <WifiOff className='h-4 w-4' /> Не в сети
                                                                                                        </span>
                                                                                                )}
                                                                                        </Badge>
                                                                                ) : (
                                                                                        <Badge variant='outline'>Неизвестно</Badge>
                                                                                )}
                                                                        </TableCell>
                                                                        <TableCell className='hidden text-xs text-muted-foreground sm:table-cell'>
                                                                                {lastSeen ? lastSeen.toLocaleString() : 'Нет данных'}
                                                                        </TableCell>
                                                               </TableRow>
                                                       )
                                               })}
                                        </TableBody>
                                </Table>
                        </div>
                </div>
        )
}
