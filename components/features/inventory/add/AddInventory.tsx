'use client'

import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { AddInventoryModal } from './forms/AddModal'

import { Button } from '@/components/ui/button'

export function AddInventory() {
	const t = useTranslations('dashboard.inventory')
	const [isModalOpen, setIsModalOpen] = useState(false)

	return (
		<div className='flex items-center gap-x-4'>
			<Button onClick={() => setIsModalOpen(true)}>
				<Plus className='mr-2 h-4 w-4' />
				{t('table.create')}
			</Button>
			<AddInventoryModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</div>
	)
}
