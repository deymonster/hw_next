'use client'

import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { AddEmployeeModal } from './forms/AddModal'

import { Button } from '@/components/ui/button'

export function AddEmployee() {
	const t = useTranslations('dashboard.employees')
	const [isModalOpen, setIsModalOpen] = useState(false)

	return (
		<div className='flex items-center gap-x-4'>
			<Button onClick={() => setIsModalOpen(true)}>
				<Plus className='mr-2 h-4 w-4' />
				{t('addEmployee')}
			</Button>
			<AddEmployeeModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</div>
	)
}
