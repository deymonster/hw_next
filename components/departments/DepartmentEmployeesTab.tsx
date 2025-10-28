import { Device, Employee } from '@prisma/client'
import { Loader2, Mail, Phone } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface EmployeeWithDevices extends Employee {
        devices?: Device[]
}

interface DepartmentEmployeesTabProps {
        employees: EmployeeWithDevices[]
        isLoading: boolean
}

export function DepartmentEmployeesTab({
        employees,
        isLoading
}: DepartmentEmployeesTabProps) {
        if (isLoading) {
                return (
                        <div className='flex items-center justify-center py-12 text-muted-foreground'>
                                <Loader2 className='mr-2 h-5 w-5 animate-spin' /> Загрузка сотрудников...
                        </div>
                )
        }

        if (!employees.length) {
                return (
                        <div className='rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground'>
                                В отделе пока нет сотрудников.
                        </div>
                )
        }

        return (
                <div className='grid gap-4 md:grid-cols-2'>
                        {employees.map(employee => {
                                const fullName = [employee.firstName, employee.lastName]
                                        .filter(Boolean)
                                        .join(' ')
                                const deviceCount = employee.devices?.length ?? 0

                                return (
                                        <Card key={employee.id}>
                                                <CardContent className='space-y-4 pt-6'>
                                                        <div>
                                                                <h3 className='text-lg font-semibold'>{
                                                                        fullName || employee.email || 'Без имени'
                                                                }</h3>
                                                                {employee.position && (
                                                                        <p className='text-sm text-muted-foreground'>
                                                                                {employee.position}
                                                                        </p>
                                                                )}
                                                        </div>
                                                        <div className='flex flex-wrap gap-3 text-sm text-muted-foreground'>
                                                                {employee.email && (
                                                                        <span className='flex items-center gap-2'>
                                                                                <Mail className='h-4 w-4' />
                                                                                {employee.email}
                                                                        </span>
                                                                )}
                                                                {employee.phone && (
                                                                        <span className='flex items-center gap-2'>
                                                                                <Phone className='h-4 w-4' />
                                                                                {employee.phone}
                                                                        </span>
                                                                )}
                                                        </div>
                                                        <div className='flex items-center justify-between'>
                                                                <Badge variant='secondary'>
                                                                        {deviceCount} {deviceCount === 1 ? 'устройство' : 'устройств'}
                                                                </Badge>
                                                                <span className='text-xs text-muted-foreground'>
                                                                        ID: {employee.id}
                                                                </span>
                                                        </div>
                                                </CardContent>
                                        </Card>
                                )
                        })}
                </div>
        )
}
