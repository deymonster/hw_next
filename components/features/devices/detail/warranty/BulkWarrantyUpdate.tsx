'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useWarranty } from '@/hooks/useWarranty'

interface BulkWarrantyUpdateProps {
	selectedDeviceIds: string[]
	onUpdate?: () => void
	onClose?: () => void
}

export function BulkWarrantyUpdate({
	selectedDeviceIds,
	onUpdate,
	onClose
}: BulkWarrantyUpdateProps) {
	const { user } = useAuth()
	const { updateMultipleWarranties, isLoading } = useWarranty({
		onSuccess: () => {
			onUpdate?.()
			onClose?.()
		}
	})

	const [warrantyDate, setWarrantyDate] = useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!user?.id) return

		const newDate = warrantyDate ? new Date(warrantyDate) : null
		await updateMultipleWarranties(selectedDeviceIds, newDate, user.id)
	}

	return (
		<div className='space-y-4'>
			<h3 className='text-lg font-semibold'>
				Массовое обновление гарантии ({selectedDeviceIds.length}{' '}
				устройств)
			</h3>

			<div>
				<Label htmlFor='bulk-warranty-date'>
					Дата окончания гарантии
				</Label>
				<Input
					id='bulk-warranty-date'
					type='date'
					value={warrantyDate}
					onChange={e => setWarrantyDate(e.target.value)}
					disabled={isLoading}
				/>
			</div>

			<div className='flex gap-2'>
				<Button
					onClick={handleSubmit}
					disabled={isLoading || !warrantyDate}
				>
					{isLoading ? 'Обновление...' : 'Обновить все'}
				</Button>
				<Button
					variant='outline'
					onClick={onClose}
					disabled={isLoading}
				>
					Отмена
				</Button>
			</div>
		</div>
	)
}
