'use client'

import { useTranslations } from "next-intl"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/elements/DataTable"
import { createEmployeeColumns } from "./EmployeeColumns"
import { Employee } from "@prisma/client"
import { useEmployees } from "@/hooks/useEmployee"
import { Heading } from "@/components/ui/elements/Heading"
import { ArrowLeft } from "lucide-react"
import { AddEmployee } from "../add/AddEmployee"
import { EmployeeDetail } from "../detail/EmployeeDetail"



export function EmployeesTable() {
    const t = useTranslations('dashboard.employees')
    const { employees, isLoading, error, refetch } = useEmployees()
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
    const columns = useMemo(() => createEmployeeColumns((key: string) => t(key)), [t])

    // Получаем данные выбранного сотрудника из кэша
    const selectedEmployee = useMemo(() => {
        if (!selectedEmployeeId || !employees) return null
        return employees.find(emp => emp.id === selectedEmployeeId) || null
    }, [selectedEmployeeId, employees])

    if (isLoading) {
        return <div className="flex items-center justify-center p-4">Загрузка сотрудников...</div>
    }

    const handleRowClick = (employee: Employee) => {
        setSelectedEmployeeId(employee.id)
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-4 text-red-500">
                <p>Ошибка загрузки сотрудников</p>
                <Button onClick={() => refetch()} className="mt-2">
                    Повторить
                </Button>
            </div>
        )
    }

    return (
        <div className='lg:px-10'>
            <div className='block items-center justify-center justify-between space-y-3 lg:flex lg:space-y-0'>
                <Heading 
                    title={t('header.heading')}
                    description={t('header.description')}
                    size='lg'
                />
                {!selectedEmployee && <AddEmployee />}
            </div>
            {selectedEmployee ? (
                <>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedEmployeeId(null)}
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                        </Button>
                        Назад
                    </div>
                    <EmployeeDetail 
                        employee={selectedEmployee}
                        onBack={() => setSelectedEmployeeId(null)}
                    />
                </>
            ) : (
                <div className='mt-5'>
                    <DataTable 
                        columns={columns}
                        data={employees || []}
                        onRowClick={handleRowClick}
                        pagination={{
                            enabled: true,
                            pageSize: 10,
                            showPageSize: true,
                            showPageNumber: true
                        }}
                        filtering={{
                            enabled: true,
                            column: 'fullName',
                            placeholder: t('table.searchPlaceholder')
                        }}
                    />
                </div>
            )}
        </div>
    )
}