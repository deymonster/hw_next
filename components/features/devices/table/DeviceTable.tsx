'use client'

import { Device } from '@prisma/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RowSelectionState } from '@tanstack/react-table'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { createContext, useContext } from 'react'

import { DeviceDetail } from '../detail/DeviceDetail'
import { BulkWarrantyUpdate } from '../detail/warranty/BulkWarrantyUpdate'
import { createDeviceColumns } from './DeviceColumns'

import { getAgentStatuses } from '@/app/actions/prometheus.actions'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { DataTable } from '@/components/ui/elements/DataTable'
import { useDevices } from '@/hooks/useDevices'

interface DeviceSelectionContextType {
	selectedDevice: Device | null
	setSelectedDevice: (device: Device | null) => void
}

const DeviceSelectionContext = createContext<
	DeviceSelectionContextType | undefined
>(undefined)

export const useDeviceSelection = () => {
	const context = useContext(DeviceSelectionContext)
	if (!context) {
		throw new Error(
			'useDeviceSelection must be used within a DeviceSelectionProvider'
		)
	}
	return context
}

export function DevicesTable() {
	const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
	const [isSelectionMode, setIsSelectionMode] = useState(false)
	const [isBulkWarrantyModalOpen, setIsBulkWarrantyModalOpen] =
		useState(false)
	const t = useTranslations('dashboard.devices')
	const { fetchDevices, fetchStats } = useDevices()
	const queryClient = useQueryClient()

	// Запрос на получение списка устройств
	const {
		data: devices = [],
		isLoading: isLoadingDevices,
		error: devicesError,
		refetch: refreshDevices
	} = useQuery({
		queryKey: ['devices'],
		queryFn: async () => {
			const devices = await fetchDevices()
			await fetchStats() // обновляем статистику
			return devices
		}
	})

	// Отдельный запрос для обновления статусов устройств
	useQuery({
		queryKey: ['device-statuses'],
		queryFn: async () => {
			if (devices.length > 0) {
				console.log(
					'[QUERY] Updating device statuses from Prometheus...'
				)
				const ipAddresses = devices.map(d => d.ipAddress)
				const result = await getAgentStatuses(ipAddresses)

				// Инвалидируем кэш только если статусы успешно обновились
				if (result.success) {
					console.log(
						'[QUERY] Invalidating devices cache after status update'
					)
					queryClient.invalidateQueries({ queryKey: ['devices'] })
				}

				return result
			}
			return null
		},
		refetchInterval: 30000, // обновляем каждые 30 секунд
		enabled: true, // всегда активен
		retry: 2 // количество повторных попыток при ошибке
	})

	const handleRowClick = (device: Device) => {
		setSelectedDevice(device)
	}

	// Получаем выделенные устройства
	const selectedDevices = useMemo(() => {
		return devices.filter((_, index) => rowSelection[index])
	}, [devices, rowSelection])

	const selectedDeviceIds = selectedDevices.map(device => device.id)

	const handleToggleSelectionMode = () => {
		setIsSelectionMode(!isSelectionMode)
		setRowSelection({}) // Сбрасываем выделение
	}

	const handleBulkWarrantyUpdate = () => {
		if (selectedDeviceIds.length > 0) {
			setIsBulkWarrantyModalOpen(true)
		}
	}

	const columns = useMemo(
		() => createDeviceColumns((key: string) => t(key), isSelectionMode),
		[t, isSelectionMode]
	)

	// Обработка состояния загрузки
	if (isLoadingDevices) {
		return (
			<div className='flex items-center justify-center p-4'>
				Loading devices...
			</div>
		)
	}

	// Обработка ошибок
	if (devicesError) {
		return (
			<div className='flex flex-col items-center justify-center p-4 text-red-500'>
				<p>Error loading devices</p>
				<Button onClick={() => refreshDevices()} className='mt-2'>
					Retry
				</Button>
			</div>
		)
	}

	return (
		<DeviceSelectionContext.Provider
			value={{ selectedDevice, setSelectedDevice }}
		>
			<div className='lg:px-10'>
				<div className='mt-5'>
					{selectedDevice ? (
						<DeviceDetail
							device={selectedDevice}
							onBack={() => setSelectedDevice(null)}
						/>
					) : (
						<>
							{/* Панель управления выделением */}
							<div className='mb-4 flex items-center justify-between'>
								<div className='flex items-center gap-2'>
									<Button
										variant={
											isSelectionMode
												? 'default'
												: 'outline'
										}
										onClick={handleToggleSelectionMode}
									>
										{isSelectionMode
											? 'Отменить выделение'
											: 'Выделить устройства'}
									</Button>

									{isSelectionMode &&
										selectedDeviceIds.length > 0 && (
											<div className='flex items-center gap-2'>
												<span className='text-sm text-muted-foreground'>
													Выбрано:{' '}
													{selectedDeviceIds.length}
												</span>
												<Button
													variant='secondary'
													onClick={
														handleBulkWarrantyUpdate
													}
												>
													Изменить гарантию
												</Button>
											</div>
										)}
								</div>
							</div>

							<DataTable
								columns={columns}
								data={devices}
								onRowClick={
									isSelectionMode ? undefined : handleRowClick
								}
								enableRowSelection={isSelectionMode}
								onRowSelectionChange={setRowSelection}
								rowSelection={rowSelection}
								pagination={{
									enabled: true,
									pageSize: 10,
									showPageSize: true,
									showPageNumber: true
								}}
								filtering={{
									enabled: true,
									column: 'deviceTag',
									placeholder: 'Search by tag...'
								}}
							/>
						</>
					)}
				</div>

				{/* Модальное окно массового обновления гарантии */}
				<Dialog
					open={isBulkWarrantyModalOpen}
					onOpenChange={setIsBulkWarrantyModalOpen}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								Массовое обновление гарантии
							</DialogTitle>
						</DialogHeader>
						<BulkWarrantyUpdate
							selectedDeviceIds={selectedDeviceIds}
							onUpdate={() => {
								// Обновляем данные после успешного изменения
								refreshDevices()
								setRowSelection({})
								setIsSelectionMode(false)
							}}
							onClose={() => setIsBulkWarrantyModalOpen(false)}
						/>
					</DialogContent>
				</Dialog>
			</div>
		</DeviceSelectionContext.Provider>
	)
}
