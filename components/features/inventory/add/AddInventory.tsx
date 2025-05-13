'use client'

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import { AddInventoryModal } from "./forms/AddModal"

export function AddInventory() {
    const t = useTranslations('dashboard.inventory.table')
    const [isModalOpen, setIsModalOpen] = useState(false)
    
    return (
        <div className='flex items-center gap-x-4'>
            <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('create')}
            </Button>
            <AddInventoryModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    )
}