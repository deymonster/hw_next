'use client'

import { Heading } from "@/components/ui/elements/Heading";
import { useTranslations } from "next-intl";
import { AddDepartmentModal } from "./forms/AddModal"
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";


export function AddDepartment() {
    const t = useTranslations('dashboard.departments')
    const [isModalOpen, setIsModalOpen] = useState(false)
    return (

        <div className='lg:px-10'>
        <div className='block items-center justify-center justify-between space-y-3 lg:flex lg:space-y-0'>
            <Heading 
                title={t('header.heading')}
                description={t('header.description')}
                size='lg'
            />
            <div className='flex items-center gap-x-4'>
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('addDepartment')}
                    </Button>
            </div>
        </div>
        <AddDepartmentModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
        />
        
      </div>
    
      )
}