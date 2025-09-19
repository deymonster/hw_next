'use client'

import { useEffect, useState } from 'react'

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

	const [purchaseDate, setPurchaseDate] = useState<Date | undefined>()
	const [warrantyPeriod, setWarrantyPeriod] = useState<number | undefined>()
	const [endDate, setEndDate] = useState<Date | null>(null)

	useEffect(() => {
		if (purchaseDate && warrantyPeriod) {
			const end = new Date(purchaseDate)
			end.setMonth(end.getMonth() + warrantyPeriod)
			setEndDate(end)
		} else {
			setEndDate(null)
		}
	}, [purchaseDate, warrantyPeriod])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!user?.id) return
		await updateMultipleWarranties(
			selectedDeviceIds,
			purchaseDate ?? null,
			warrantyPeriod ?? null,
			user.id
		)
	}

	return (
		<div className='space-y-4'>
			<div className='text-center'>
				<h3 className='text-lg font-semibold'>
					Массовое обновление гарантии
				</h3>
				<p className='text-sm text-muted-foreground'>
					Выбрано устройств: {selectedDeviceIds.length}
				</p>
			</div>

			<div className='space-y-2'>
				<Label htmlFor='bulk-purchase-date'>Дата покупки</Label>
				<Input
					id='bulk-purchase-date'
					type='date'
					value={
						purchaseDate
							? purchaseDate.toISOString().split('T')[0]
							: ''
					}
					onChange={e =>
						setPurchaseDate(
							e.target.value
								? new Date(e.target.value)
								: undefined
						)
					}
					disabled={isLoading}
					className='w-full'
				/>
			</div>

			<div className='space-y-2'>
				<Label htmlFor='bulk-warranty-period'>
					Срок гарантии (мес.)
				</Label>
				<select
					id='bulk-warranty-period'
					className='h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
					value={warrantyPeriod?.toString() ?? ''}
					onChange={e =>
						setWarrantyPeriod(
							e.target.value ? Number(e.target.value) : undefined
						)
					}
					disabled={isLoading}
				>
					<option value=''>Не задано</option>
					<option value='12'>12</option>
					<option value='24'>24</option>
					<option value='36'>36</option>
					<option value='48'>48</option>
					<option value='60'>60</option>
				</select>
			</div>

			{endDate && (
				<div className='rounded-md bg-muted p-3'>
					<p className='text-sm text-muted-foreground'>
						Дата окончания гарантии:{' '}
						<span className='font-medium'>
							{endDate.toLocaleDateString('ru-RU', {
								year: 'numeric',
								month: 'long',
								day: '2-digit'
							})}
						</span>
					</p>
				</div>
			)}

			<div className='flex gap-2 pt-2'>
				<Button
					onClick={handleSubmit}
					disabled={isLoading}
					className='flex-1'
				>
					{isLoading ? 'Обновление...' : 'Обновить все'}
				</Button>
				<Button
					variant='outline'
					onClick={onClose}
					disabled={isLoading}
					className='flex-1'
				>
					Отмена
				</Button>
			</div>
		</div>
	)
}
