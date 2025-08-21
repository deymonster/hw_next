'use client'

import { CheckCircle, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useInventoryContext } from '@/contexts/InventoryContext'
import { useInventory } from '@/hooks/useInventory'

interface FinalStepProps {
	onFinish: () => void
	onBack: () => void
}

export function FinalStep({ onFinish, onBack }: FinalStepProps) {
	const t = useTranslations('dashboard.inventory.modal.create.steps.final')
	const { state, resetState } = useInventoryContext()
	const { createInventory, addInventoryItemAsync, refetch } = useInventory()
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isSuccess, setIsSuccess] = useState(false)
	const [currentItemIndex, setCurrentItemIndex] = useState(0)
	const [inventoryId, setInventoryId] = useState<string | null>(null)
	const { data: session } = useSession()
	const [processedDeviceIds, setProcessedDeviceIds] = useState<Set<string>>(
		new Set()
	)

	const totalItems = state.inventoryItems.length
	const progress =
		totalItems > 0 ? Math.round((currentItemIndex / totalItems) * 100) : 0

	// Функция для добавления элементов инвентаризации
	const addItems = async (invId: string) => {
		if (!invId || totalItems === 0) {
			return
		}

		setIsSubmitting(true)
		setCurrentItemIndex(0) // Сбрасываем индекс при начале процесса
		setProcessedDeviceIds(new Set()) // Сбрасываем обработанные устройства

		try {
			// Обрабатываем каждый элемент последовательно
			for (let i = 0; i < totalItems; i++) {
				const item = state.inventoryItems[i]

				// Пропускаем дубликаты deviceId
				if (processedDeviceIds.has(item.deviceId)) {
					setCurrentItemIndex(i + 1)
					continue
				}

				try {
					await addInventoryItemAsync({
						inventoryId: invId,
						item: {
							deviceId: item.deviceId,
							inventoryId: invId,
							processor: item.processor || undefined,
							motherboard: item.motherboard,
							memory: item.memory,
							storage: item.storage,
							networkCards: item.networkCards,
							videoCards: item.videoCards,
							diskUsage: item.diskUsage,
							employeeId: item.employeeId || undefined,
							departmentId: item.departmentId || undefined
						}
					})

					// Добавляем устройство в список обработанных
					setProcessedDeviceIds(
						prev => new Set([...prev, item.deviceId])
					)
					// Обновляем индекс текущего элемента для прогресс-бара
					setCurrentItemIndex(i + 1)
				} catch (error) {
					console.error(
						`Ошибка при добавлении устройства ${item.deviceName}:`,
						error
					)
					toast.error(`${t('errorAddingItem')}: ${item.deviceName}`)
					// Продолжаем с следующим устройством даже при ошибке
					setCurrentItemIndex(i + 1)
				}
			}

			// После успешного добавления всех элементов
			setIsSuccess(true)
			toast.success(t('successMessage'))

			// Сбрасываем состояние контекста
			resetState()
			refetch()

			// Закрываем модальное окно через 1.5 секунды
			setTimeout(() => {
				onFinish()
			}, 1500)
		} catch (error) {
			console.error(
				'Ошибка при добавлении элементов инвентаризации:',
				error
			)
			toast.error(t('errorAddingItems'))
			setIsSubmitting(false)
		}
	}

	const handleSubmit = async () => {
		try {
			setIsSubmitting(true)

			// Проверяем наличие пользователя
			if (!session?.user?.id) {
				toast.error('Не удалось определить пользователя')
				setIsSubmitting(false)
				return
			}

			// Проверяем наличие устройств для инвентаризации
			if (state.inventoryItems.length === 0) {
				toast.error(t('noDevicesError'))
				setIsSubmitting(false)
				return
			}

			// Создаем новую инвентаризацию и получаем её ID
			const newInventoryId = await createInventory(
				session.user.id,
				state.selectedDepartments.length > 0
					? state.selectedDepartments
					: undefined
			)

			// Устанавливаем ID и запускаем процесс добавления устройств
			setInventoryId(newInventoryId)
			await addItems(newInventoryId)
		} catch (error) {
			console.error('Ошибка при создании инвентаризации:', error)
			toast.error(t('errorMessage'))
			setIsSubmitting(false)
		}
	}

	return (
		<div className='space-y-8'>
			<div>
				<p className='text-sm text-muted-foreground'>
					{t('description')}
				</p>
			</div>

			{isSuccess ? (
				<div className='flex flex-col items-center justify-center py-8'>
					<CheckCircle className='mb-4 h-16 w-16 text-green-500' />
					<h3 className='text-xl font-medium'>{t('successTitle')}</h3>
					<p className='mt-2 text-center text-muted-foreground'>
						{t('successDescription')}
					</p>
				</div>
			) : (
				<div className='space-y-6'>
					<div className='rounded-lg bg-muted/50 p-4'>
						<h3 className='mb-2 font-medium'>
							{t('summaryTitle')}
						</h3>
						<p>
							{t('itemsCount', {
								count: state.inventoryItems.length
							})}
						</p>
						<p>
							{t('dateInfo', {
								date: new Date().toLocaleDateString()
							})}
						</p>
					</div>

					{inventoryId && (
						<div className='h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700'>
							<div
								className='h-2.5 rounded-full bg-blue-600'
								style={{ width: `${progress}%` }}
							></div>
							<p className='mt-1 text-xs text-muted-foreground'>
								{t('processingItems', {
									current: currentItemIndex,
									total: totalItems
								})}
							</p>
						</div>
					)}

					<div className='flex justify-between'>
						<Button
							type='button'
							variant='outline'
							onClick={onBack}
							disabled={isSubmitting || !!inventoryId}
						>
							{t('backButton')}
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={isSubmitting || !!inventoryId}
						>
							{isSubmitting || inventoryId ? (
								<>
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									{t('submittingButton')}
								</>
							) : (
								t('submitButton')
							)}
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}
