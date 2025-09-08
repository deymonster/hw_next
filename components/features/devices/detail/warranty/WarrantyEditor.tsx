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

// Функция для форматирования даты в формате "месяц год"
function formatWarrantyDate(dateString: string | null): string {
	if (!dateString) return ''

	const date = new Date(dateString)
	const months = [
		'январь',
		'февраль',
		'март',
		'апрель',
		'май',
		'июнь',
		'июль',
		'август',
		'сентябрь',
		'октябрь',
		'ноябрь',
		'декабрь'
	]

	return `${months[date.getMonth()]} ${date.getFullYear()} г.`
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
			<div className='flex flex-col space-y-2'>
				<Label htmlFor='warranty-date'>Дата окончания гарантии</Label>
				<div className='flex items-center gap-4'>
					<Input
						id='warranty-date'
						type='date'
						value={warrantyDate}
						onChange={e => setWarrantyDate(e.target.value)}
						disabled={isLoading}
						className='w-auto'
					/>
					{monthsLeft !== null && (
						<div className='whitespace-nowrap text-sm text-muted-foreground'>
							{monthsLeft > 0
								? `${monthsLeft} мес., дата окончания гарантии: ${formatWarrantyDate(currentWarrantyStatus)}`
								: 'Гарантия истекла'}
						</div>
					)}
				</div>
			</div>

			<Button onClick={handleSubmit} disabled={isLoading} size='default'>
				{isLoading ? 'Сохранение...' : 'Сохранить'}
			</Button>
		</div>
	)
}
