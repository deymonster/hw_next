'use client'

import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { AddDepartmentModal } from './forms/AddModal'

import { Button } from '@/components/ui/button'

export function AddDepartment() {
	const t = useTranslations('dashboard.departments')
	const [isModalOpen, setIsModalOpen] = useState(false)
	return (
		<div className='flex items-center gap-x-4'>
			<Button onClick={() => setIsModalOpen(true)}>
				<Plus className='mr-2 h-4 w-4' />
				{t('addDepartment')}
			</Button>
			<AddDepartmentModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</div>
	)
}
