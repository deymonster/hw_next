'use client'

import { Device, Employee } from '@prisma/client'
import { useMemo, useState } from 'react'
import { ArrowLeft, Laptop, Users2 } from 'lucide-react'
import Link from 'next/link'

import { DeviceAssignmentWizard } from './DeviceAssignmentWizard'
import { DepartmentDevicesTab } from './DepartmentDevicesTab'
import { DepartmentEmployeesTab } from './DepartmentEmployeesTab'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DepartmentWithCounts } from '@/hooks/useDepartment'
import { useDepartmentDevices } from '@/hooks/useDepartmentDevices'
import { useEmployees } from '@/hooks/useEmployee'

type EmployeeWithDevices = Employee & { devices?: Device[] }
type DepartmentDevice = Device & {
        onlineStatus?: {
                isOnline: boolean
                lastSeen: Date | null
        } | null
}

interface DepartmentManagerProps {
        department: DepartmentWithCounts
}

export function DepartmentManager({ department }: DepartmentManagerProps) {
        const [wizardOpen, setWizardOpen] = useState(false)
        const {
                employees: departmentEmployees = [],
                isLoading: employeesLoading,
                refetch: refetchEmployees
        } = useEmployees({ departmentId: department.id })
        const {
                devices: allDevices = [],
                isLoading: devicesLoading,
                refetch: refetchDevices
        } = useDepartmentDevices()

        const employeesWithRelations = departmentEmployees as EmployeeWithDevices[]
        const devicesWithStatus = allDevices as DepartmentDevice[]

        const departmentDevices = useMemo(
                () => devicesWithStatus.filter(device => device.departmentId === department.id),
                [devicesWithStatus, department.id]
        )

        const description = department.description || 'Описание отдела не указано.'

        return (
                <div className='mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 lg:px-0'>
                        <div className='flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm'>
                                <div className='flex flex-col justify-between gap-4 md:flex-row md:items-center'>
                                        <div className='space-y-2'>
                                                <Link href='/dashboard/departments'>
                                                        <Button variant='ghost' size='sm' className='-ml-2 h-8 px-2'>
                                                                <ArrowLeft className='mr-2 h-4 w-4' /> Назад к отделам
                                                        </Button>
                                                </Link>
                                                <div>
                                                        <h1 className='text-2xl font-semibold'>{department.name}</h1>
                                                        <p className='text-sm text-muted-foreground'>{description}</p>
                                                </div>
                                        </div>
                                        <Button onClick={() => setWizardOpen(true)}>Назначить устройства</Button>
                                </div>
                                <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                                        <Card>
                                                <CardContent className='flex items-center justify-between pt-6'>
                                                        <div>
                                                                <p className='text-xs uppercase text-muted-foreground'>Сотрудники</p>
                                                                <p className='text-2xl font-semibold'>{department.employeesCount}</p>
                                                        </div>
                                                        <Users2 className='h-8 w-8 text-muted-foreground' />
                                                </CardContent>
                                        </Card>
                                        <Card>
                                                <CardContent className='flex items-center justify-between pt-6'>
                                                        <div>
                                                                <p className='text-xs uppercase text-muted-foreground'>Устройства</p>
                                                                <p className='text-2xl font-semibold'>{department.deviceCount}</p>
                                                        </div>
                                                        <Laptop className='h-8 w-8 text-muted-foreground' />
                                                </CardContent>
                                        </Card>
                                </div>
                        </div>

                        <Tabs defaultValue='employees' className='w-full'>
                                <TabsList className='grid w-full max-w-md grid-cols-2'>
                                        <TabsTrigger value='employees'>Сотрудники</TabsTrigger>
                                        <TabsTrigger value='devices'>Устройства</TabsTrigger>
                                </TabsList>
                                <TabsContent value='employees' className='mt-6'>
                                        <DepartmentEmployeesTab
                                                employees={employeesWithRelations}
                                                isLoading={employeesLoading}
                                        />
                                </TabsContent>
                                <TabsContent value='devices' className='mt-6'>
                                        <DepartmentDevicesTab
                                                devices={departmentDevices}
                                                employees={employeesWithRelations}
                                                isLoading={devicesLoading}
                                                onAssignClick={() => setWizardOpen(true)}
                                        />
                                </TabsContent>
                        </Tabs>

                        <DeviceAssignmentWizard
                                open={wizardOpen}
                                onClose={() => setWizardOpen(false)}
                                departmentId={department.id}
                                employees={employeesWithRelations}
                                devices={devicesWithStatus}
                                onDevicesRefresh={refetchDevices}
                                onEmployeesRefresh={refetchEmployees}
                        />
                </div>
        )
}
