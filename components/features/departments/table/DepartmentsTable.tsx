'use client'

import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/elements/DataTable";
import { createDepartmentColumns } from "./DepartmentsColumns";
import { DepartmentWithCounts, useDepartment } from "@/hooks/useDepartment";
import { ArrowLeft } from "lucide-react";
import { DepartmentDetail } from "../detail/DepartmentsDetail";
import { AddDepartment } from '@/components/features/departments/add/AddDepartment'
import { Heading } from "@/components/ui/elements/Heading";


export function DepartmentsTable() {
    // Состояние для хранения выбранного отдела
    const t = useTranslations('dashboard.departments')
    const { departments, loading: isLoading, error, refresh } = useDepartment();
    const [selectedDepartment, setSelectedDepartment] = useState<DepartmentWithCounts | null>(null);
    const columns = useMemo(() => createDepartmentColumns((key: string) => t(key)), [t])

    // Обработка состояния загрузки
    if (isLoading) {
        return <div className="flex items-center justify-center p-4">Загрузка отделов...</div>
    }

    const handleRowClick = (department: DepartmentWithCounts) => {
        setSelectedDepartment(department);
    }

    // Обработка ошибки
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-4 text-red-500">
                <p>Ошибка загрузки отделов</p>
                <Button onClick={() => refresh()} className="mt-2">
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
                {!selectedDepartment && <AddDepartment />}
            </div>
            {selectedDepartment ? (
                <>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedDepartment(null)}
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                        </Button>
                        Назад
                    </div>
                    <DepartmentDetail 
                        department={selectedDepartment}
                        onBack={() => setSelectedDepartment(null)}
                    />
                </>
            ) : (
                <>  
                    <div className='mt-5'>
                    <DataTable 
                        columns={columns} 
                        data={departments}
                        onRowClick={handleRowClick}
                        pagination={{
                            enabled: true,
                            pageSize: 10,
                            showPageSize: true,
                            showPageNumber: true
                        }}
                        filtering={{
                            enabled: true,
                            column: 'name',
                            placeholder: 'Поиск по названию...'
                        }}
                    />
                    </div>
                </>
                
            )}
        </div>
    
    )
}