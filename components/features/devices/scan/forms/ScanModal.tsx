'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
	scanDeviceSchema,
	type TypeScanDeviceSchema
} from '@/schemas/scan/scan.schema'

import { ScanTable } from '../../table/ScanTable'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useDevicesContext } from '@/contexts/DeviceContext'
import { useDeviceInfo } from '@/hooks/useDeviceInfo'
import { useNetworkScanner } from '@/hooks/useNetworkScanner'
import type { NetworkDiscoveredAgent } from '@/services/network-scanner/network-scanner.interfaces'

export function ScanModal() {
	const t = useTranslations('dashboard.devices.scanModal')
	const queryClient = useQueryClient()

	// Хуки для сканирования и управления устройствами
	const {
		startScan,
		stopScan,
		isScanning,
		getSubnet,
		resetScanner,
		progress,
		discoveredAgents
	} = useNetworkScanner()
	const { isLoading, addMultipleDevices } = useDeviceInfo()
	const { refreshDevices } = useDevicesContext()

	// Локальное состояние модального окна
	const [isOpen, setIsOpen] = useState(false)
	const [selectedDevices, setSelectedDevices] = useState<string[]>([])
	const [localAgents, setLocalAgents] = useState<NetworkDiscoveredAgent[]>([])
	const [isAddingDevices, setIsAddingDevices] = useState(false)

	// Инициализация формы с валидацией
	const form = useForm<TypeScanDeviceSchema>({
		resolver: zodResolver(scanDeviceSchema),
		defaultValues: {
			subnet: ''
		}
	})

	const { isValid } = form.formState

	// Функция для получения подсети, вынесенная в useCallback
	const fetchSubnet = useCallback(async () => {
		const subnet = await getSubnet({
			onError: () => {
				toast.error(t('subnetError'))
			}
		})
		if (subnet) {
			form.setValue('subnet', subnet)
		}
	}, [getSubnet, t, form])

	// Функция закрытия модального окна
	const handleModalClose = useCallback(() => {
		if (isScanning) {
			stopScan()
		}
		resetScanner()
		setSelectedDevices([])
		setLocalAgents([])
		form.reset()
		refreshDevices()
		setIsOpen(false)
	}, [isScanning, stopScan, resetScanner, form, refreshDevices])

	// Эффект для инициализации модального окна
	useEffect(() => {
		if (isOpen) {
			resetScanner()
			setSelectedDevices([])
			fetchSubnet()
		}
		return () => {
			if (isScanning) {
				stopScan()
			}
		}
	}, [isOpen, resetScanner, isScanning, stopScan, fetchSubnet])

	async function onSubmit(data: TypeScanDeviceSchema) {
		if (isScanning) {
			// Если уже сканируем, останавливаем
			stopScan()
			return
		}

		setSelectedDevices([])
		setLocalAgents([])

		const result = await startScan(
			{ subnet: data.subnet },
			{
				onSuccess: () => {
					toast.success(t('successScanMessage'))
				},
				onError: () => {
					toast.error(t('errorScanMessage'))
				}
			}
		)

		if (Array.isArray(result)) {
			if (result.length > 0) {
				setLocalAgents(result)
			} else {
				setLocalAgents([])
			}
		} else {
			setLocalAgents([])
		}
	}

	useEffect(() => {
		setLocalAgents(discoveredAgents)
	}, [discoveredAgents])

	const handleAddDevices = async () => {
		try {
			console.log(
				`[SCAN_MODAL] Starting to add ${selectedDevices.length} devices...`
			)
			console.log('[SCAN_MODAL] Selected devices:', selectedDevices)
			setIsAddingDevices(true)

			const validDevices: string[] = []
			for (const ipAddress of selectedDevices) {
				const agent = localAgents.find(a => a.ipAddress === ipAddress)
				if (!agent) {
					console.warn(
						`[SCAN_MODAL] Agent not found for ${ipAddress}`
					)
					continue
				}

				if (agent.isRegistered) {
					toast.error(
						`Устройство ${agent.agentKey} уже зарегистрировано`
					)
					continue
				}

				validDevices.push(ipAddress)
			}

			if (validDevices.length === 0) {
				toast.error('Нет устройств для добавления')
				return
			}

			console.log(
				`[SCAN_MODAL] Sending ${validDevices.length} valid devices for addition:`,
				validDevices
			)
			const result = await addMultipleDevices(validDevices)

			if (result.success) {
				toast.success(`Добавлено устройств: ${result.addedCount}`, {
					id: 'add-devices'
				})

				const errorCount = Object.keys(result.errors).length
				if (errorCount > 0) {
					toast.warning(
						`Не удалось добавить ${errorCount} устройств: ${JSON.stringify(result.errors)}`
					)
					console.warn(
						'[SCAN_MODAL] Errors during device addition:',
						result.errors
					)
				}

				// Инвалидируем кэш devices после успешного добавления
				console.log('[SCAN_MODAL] Invalidating devices cache...')
				queryClient.invalidateQueries({ queryKey: ['devices'] })

				// Закрываем модальное окно
				console.log('[SCAN_MODAL] Closing modal...')
				handleModalClose()
			} else {
				toast.error(
					`Не удалось добавить устройства: ${JSON.stringify(result.errors)}`,
					{ id: 'add-devices' }
				)
				console.error(
					'[SCAN_MODAL] Errors during device addition:',
					result.errors
				)
			}
		} catch (error) {
			console.error('[SCAN_MODAL] Failed to add devices:', error)
			toast.error('Ошибка добавления устройства', { id: 'add-devices' })
		} finally {
			setIsAddingDevices(false)
		}
	}

	return (
		<Dialog
			open={isOpen}
			onOpenChange={open => {
				if (!open) {
					handleModalClose()
				} else {
					setIsOpen(open)
				}
			}}
		>
			<DialogTrigger
				asChild
				onClick={() => {
					resetScanner()
					setSelectedDevices([])
					form.reset()
					setIsOpen(true)
				}}
			>
				<Button>{t('trigger')}</Button>
			</DialogTrigger>
			<DialogContent className='max-h-[80vh] max-w-[800px] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle className='text-xl'>
						{t('heading')}
					</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className='space-y-6'
					>
						<div className='w-full space-y-6'>
							<FormField
								control={form.control}
								name='subnet'
								render={({ field }) => (
									<FormItem className='w-full'>
										<FormLabel>
											{t('subnetLabel')}
										</FormLabel>
										<FormControl>
											<Input
												{...field}
												className='w-full'
												placeholder='192.168.1.0/24'
												disabled={isScanning}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<div className='w-full'>
								<ScanTable
									data={localAgents || []}
									_isLoading={isScanning}
									onRowSelectionChange={setSelectedDevices}
								/>
							</div>
						</div>

						<DialogFooter className='gap-2'>
							{localAgents &&
								localAgents.length > 0 &&
								!isScanning && (
									<Button
										type='button'
										variant='default'
										disabled={
											selectedDevices.length === 0 ||
											isLoading ||
											isAddingDevices
										}
										onClick={handleAddDevices}
									>
										{isAddingDevices ? (
											<>
												<Loader2 className='mr-2 h-4 w-4 animate-spin' />
												Добавление...
											</>
										) : (
											'Добавить'
										)}
									</Button>
								)}

							{isScanning && (
								<div className='w-full space-y-2'>
									<div className='flex items-center justify-between text-sm text-muted-foreground'>
										<span>Сканирование сети...</span>
										<span>
											{progress}% · {localAgents.length}{' '}
											устройств
										</span>
									</div>
									<div className='h-2 w-full rounded-full bg-secondary'>
										<div
											className='h-2 rounded-full bg-primary transition-all duration-300'
											style={{ width: `${progress}%` }}
										/>
									</div>
								</div>
							)}
							{isScanning ? (
								<Button
									type='button'
									variant='destructive'
									onClick={stopScan}
								>
									Остановить сканирование
								</Button>
							) : (
								<Button type='submit' disabled={!isValid}>
									{t('scanButton')}
								</Button>
							)}
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
