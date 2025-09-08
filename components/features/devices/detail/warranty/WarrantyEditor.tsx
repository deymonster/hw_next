'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useWarranty } from '@/hooks/useWarranty'

interface WarrantyEditorProps {
	deviceId: string
	currentWarrantyStatus: string | null
	onUpdate?: () => void
}

export function WarrantyEditor({
	deviceId,
	currentWarrantyStatus,
	onUpdate
}: WarrantyEditorProps) {
	const { user } = useAuth()
	const { updateWarranty, getWarrantyMonthsLeft, isLoading } = useWarranty({
		onSuccess: () => {
			onUpdate?.()
		}
	})

	const [warrantyDate, setWarrantyDate] = useState(
		currentWarrantyStatus
			? new Date(currentWarrantyStatus).toISOString().split('T')[0]
			: ''
	)

	const monthsLeft = getWarrantyMonthsLeft(currentWarrantyStatus)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!user?.id) return

		const newDate = warrantyDate ? new Date(warrantyDate) : null
		await updateWarranty(deviceId, newDate, user.id)
	}

	return (
		<div className='space-y-4'>
			<div>
				<Label htmlFor='warranty-date'>Дата окончания гарантии</Label>
				<Input
					id='warranty-date'
					type='date'
					value={warrantyDate}
					onChange={e => setWarrantyDate(e.target.value)}
					disabled={isLoading}
				/>
			</div>

			{monthsLeft !== null && (
				<div className='text-sm text-muted-foreground'>
					{monthsLeft > 0
						? `Осталось: ${monthsLeft} мес.`
						: 'Гарантия истекла'}
				</div>
			)}

			<Button onClick={handleSubmit} disabled={isLoading} size='default'>
				{isLoading ? 'Сохранение...' : 'Сохранить'}
			</Button>
		</div>
	)
}
