'use client'

import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable } from "@/components/ui/elements/DataTable";
import { createContext, useContext } from "react";
import { Department } from "@prisma/client";
import { createDepartmentColumns } from "./DepartmentsColumns";
import { useDepartment } from "@/hooks/useDepartment";



export function DepartmentsTable() {
    // Состояние для хранения выбранного отдела
    const t = useTranslations('dashboard.departments')
    const { departments, loading: isLoading, error, refresh } = useDepartment();

    const columns = useMemo(() => createDepartmentColumns((key: string) => t(key)), [t])

    // Обработка состояния загрузки
    if (isLoading) {
        return <div className="flex items-center justify-center p-4">Загрузка отделов...</div>
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
            <div className='mt-5'>
                <DataTable 
                    columns={columns} 
                    data={departments}
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
        </div>
    )
}