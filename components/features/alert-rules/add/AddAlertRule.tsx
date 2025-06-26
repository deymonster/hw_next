'use client'

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Plus, Settings } from "lucide-react"
import { useState } from "react"
import { AddAlertRuleModal } from "./forms/AddModal"


export function AddAlertRule() {
    const t = useTranslations('dashboard.monitoring.alertRules')
    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleOpenModal = () => {
        setIsModalOpen(true)
    }

    const handleModalClose = () => {
        setIsModalOpen(false)
    }


    return (
        <div className='flex items-center gap-x-4'>
            
            <Button onClick={handleOpenModal} className="text-xs h-8 px-3">
                <Plus className="mr-2 h-4 w-4" />
                {t('addRule')}
            </Button>


            <AddAlertRuleModal 
                isOpen={isModalOpen}
                onClose={handleModalClose}
            />
        </div>
    )
}