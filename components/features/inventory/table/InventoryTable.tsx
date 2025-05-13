'use client'

import { useTranslations } from "next-intl"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/elements/DataTable"
import { createInventoryColumns } from "./InventoryColumns"
import { Heading } from "@/components/ui/elements/Heading"
import { useInventory } from "@/hooks/useInventory"


export function InventoryTable() {
    const t = useTranslations('dashboard.inventory')
    const { 
        inventories, 
        isLoadingInventories, 
        inventoriesError, 
        refetch 
    } = useInventory()
    const formattedInventories = useMemo(() => 
        inventories.map(inventory => ({
            ...inventory,
            items: inventory.items || [],
            departments: inventory.departments || []
        })), [inventories])
    const columns = useMemo(() => createInventoryColumns((key: string) => t(key)), [t])

    if (isLoadingInventories) {
        return (
            <div className="flex items-center justify-center p-4">
                {t('table.loading')}
            </div>
        )
    }

    if (inventoriesError) {
        return (
            <div className="flex flex-col items-center justify-center p-4 text-red-500">
                <p>{t('table.error')}</p>
                <Button onClick={() => refetch()} className="mt-2">
                    {t('table.refetch')}
                </Button>
            </div>
        )
    }


    return (
        <div className='lg:px-10'>
            <div className='block items-center justify-between space-y-3 lg:flex lg:space-y-0'>
            <Heading 
                    title={t('header.heading')}
                    description={t('header.description')}
                    size='lg'
                />
            </div>
            <div className='mt-5'>
            <DataTable 
                    columns={columns}
                    data={formattedInventories}
                    pagination={{
                        enabled: true,
                        pageSize: 10,
                        showPageSize: true,
                        showPageNumber: true
                    }}
                    filtering={{
                        enabled: true,
                        column: 'createdAt',
                        placeholder: t('table.searchPlaceholder')
                    }}
                />
            </div>
        </div>
    )
}