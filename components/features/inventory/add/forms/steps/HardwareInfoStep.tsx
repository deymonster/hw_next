'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Device } from '@prisma/client'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Progress } from '@/components/ui/progress'
import { useInventoryContext } from '@/contexts/InventoryContext'
import { useInventoryCollection } from '@/hooks/useInventoryCollection'

const hardwareInfoSchema = z.object({
	devices: z.array(
		z.object({
			id: z.string(),
			info: z.any().optional()
		})
	)
})

type HardwareInfoForm = z.infer<typeof hardwareInfoSchema>

interface HardwareInfoStepProps {
	devices: Device[]
	onNext: (
		info: Array<{
			deviceId: string
			deviceName: string
			ipAddress: string
			processor: string | null
			motherboard: Record<string, unknown> | null
			memory: Record<string, unknown> | null
			storage: Record<string, unknown> | null
			networkCards: Record<string, unknown> | null
			videoCards: Record<string, unknown> | null
			diskUsage: Record<string, unknown> | null
			departmentId: string | null
			employeeId: string | null
			serialNumber: string | null
		}>
	) => void
	onBack: () => void
}

interface DeviceStatus {
	id: string
	name: string
	ipAddress: string
	status: 'loading' | 'success' | 'error'
	error?: string
}

export function HardwareInfoStep({
	devices,
	onNext,
	onBack
}: HardwareInfoStepProps) {
	const t = useTranslations('dashboard.inventory.modal.create.steps.hardware')
	const { collectDeviceInfo, isCollecting } = useInventoryCollection()
	const { state, addInventoryItem } = useInventoryContext()
	const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([])
	const [progress, setProgress] = useState(0)
	const [isAllLoaded, setIsAllLoaded] = useState(false)
	const [successCount, setSuccessCount] = useState(0)
	const [errorCount, setErrorCount] = useState(0)
	const dataCollectionStartedRef = useRef(false)

	const form = useForm<HardwareInfoForm>({
		resolver: zodResolver(hardwareInfoSchema),
		defaultValues: {
			devices: []
		}
	})

	useEffect(() => {
		if (
			devices.length > 0 &&
			!dataCollectionStartedRef.current &&
			!isCollecting
		) {
			dataCollectionStartedRef.current = true

			const fetchDevicesInfo = async () => {
				setProgress(0)

				console.log(
					`[HardwareInfoStep] Начало сбора данных для ${devices.length} устройств`
				)
				const initialStatuses: DeviceStatus[] = devices.map(device => ({
					id: device.id,
					name: device.name,
					ipAddress: device.ipAddress,
					status: 'loading',
					info: null
				}))

				setDeviceStatuses(initialStatuses)

				const updatedStatuses = [...initialStatuses]
				let completedCount = 0
				let successCounter = 0
				let errorCounter = 0

				for (const device of devices) {
					try {
						if (!device.id) {
							console.error(
								`[HardwareInfoStep] Отсутствует ID устройства:`,
								device
							)
							updatedStatuses[devices.indexOf(device)] = {
								id: device.id || 'unknown',
								name: device.name || 'Неизвестное устройство',
								ipAddress: device.ipAddress || 'Неизвестный IP',
								status: 'error',
								error: 'Не указан идентификатор устройства'
							}
							errorCounter++
							continue
						}
						// Вызываем метод сбора информации
						console.log(
							`[HardwareInfoStep] Вызов collectDeviceInfo для устройства ${device.id}`
						)
						// Получаем результат из состояния collectionResults
						const { success, result } =
							await collectDeviceInfo(device)
						console.log(
							`[HardwareInfoStep] Результат из collectionResults:`,
							result
						)

						if (
							success &&
							result &&
							result.status === 'success' &&
							result.data
						) {
							// Получаем информацию об устройстве из результата и сразу сохраняем в контекст
							addInventoryItem({
								deviceId: device.id,
								deviceName: device.name,
								ipAddress: device.ipAddress,
								processor: result.data.processor,
								motherboard: result.data.motherboard,
								memory: result.data.memory,
								storage: result.data.storage,
								networkCards: result.data.networkCards,
								videoCards: result.data.videoCards,
								diskUsage: result.data.diskUsage,
								departmentId: device.departmentId,
								employeeId: device.employeeId,
								serialNumber: result.data.serialNumber
							})

							updatedStatuses[devices.indexOf(device)] = {
								id: device.id,
								name: device.name || 'Неизвестное устройство',
								ipAddress: device.ipAddress || 'Неизвестный IP',
								status: 'success'
							}
							successCounter++
						} else {
							updatedStatuses[devices.indexOf(device)] = {
								id: device.id,
								name: device.name || 'Неизвестное устройство',
								ipAddress: device.ipAddress || 'Неизвестный IP',
								status: 'error',
								error:
									result?.error ||
									'Не удалось получить информацию'
							}
							errorCounter++
						}
					} catch (error) {
						console.error(
							`[HardwareInfoStep] Ошибка при обработке устройства ${device.id}:`,
							error
						)
						updatedStatuses[devices.indexOf(device)] = {
							id: device.id,
							name: device.name,
							ipAddress: device.ipAddress,
							status: 'error',
							error: 'Ошибка при получении информации'
						}
						errorCounter++
					}

					completedCount++
					setProgress(
						Math.round((completedCount / devices.length) * 100)
					)
					setSuccessCount(successCounter)
					setErrorCount(errorCounter)
					setDeviceStatuses([...updatedStatuses])
				}

				setIsAllLoaded(true)
			}
			fetchDevicesInfo()
		}
	}, [devices, collectDeviceInfo, isCollecting, addInventoryItem])

	const onSubmit = (_data: HardwareInfoForm) => {
		onNext(state.inventoryItems)
	}

	return (
		<div className='space-y-8'>
			<div>
				<p className='text-sm text-muted-foreground'>
					{t('description')}
				</p>
			</div>

			{isCollecting && (
				<div className='space-y-4'>
					<div className='flex items-center justify-center'>
						<Loader2 className='mr-2 h-8 w-8 animate-spin' />
						<span>{t('loading')}</span>
					</div>
					<Progress value={progress} className='w-full' />
					<p className='text-center text-sm text-muted-foreground'>
						{t('loadingProgress', { progress })}
					</p>
				</div>
			)}

			{!isCollecting && isAllLoaded && (
				<Alert variant={errorCount > 0 ? 'destructive' : 'default'}>
					<div className='flex items-center gap-2'>
						{errorCount > 0 ? (
							<AlertCircle className='h-4 w-4' />
						) : (
							<CheckCircle className='h-4 w-4' />
						)}
						<AlertTitle>
							{errorCount === 0
								? t('collectionComplete')
								: t('collectionCompleteWithErrors')}
						</AlertTitle>
					</div>
					<AlertDescription className='mt-2'>
						{t('devicesProcessed', { total: devices.length })}
						<div className='mt-1 flex gap-4'>
							<span className='text-green-600'>
								{t('successCount', { count: successCount })}
							</span>
							{errorCount > 0 && (
								<span className='text-red-600'>
									{t('errorCount', { count: errorCount })}
								</span>
							)}
						</div>
					</AlertDescription>
				</Alert>
			)}

			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className='space-y-6'
				>
					<div className='flex justify-between'>
						<Button
							type='button'
							variant='outline'
							onClick={onBack}
						>
							{t('backButton')}
						</Button>
						<Button
							type='submit'
							disabled={
								!isAllLoaded ||
								deviceStatuses.every(d => d.status === 'error')
							}
						>
							{t('nextButton')}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	)
}
