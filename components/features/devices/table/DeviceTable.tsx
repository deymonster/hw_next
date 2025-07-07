'use client'

import { Device } from '@prisma/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { createContext, useContext } from 'react'

import { DeviceDetail } from '../detail/DeviceDetail'
import { createDeviceColumns } from './DeviceColumns'

import { getAgentStatuses } from '@/app/actions/prometheus.actions'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
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

	const columns = useMemo(
		() => createDeviceColumns((key: string) => t(key)),
		[t]
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
				<Breadcrumb className='mt-5 flex items-center space-x-1 text-sm text-muted-foreground'>
					<BreadcrumbItem>
						<BreadcrumbLink
							onClick={() => setSelectedDevice(null)}
							className='font-medium'
						>
							devices
						</BreadcrumbLink>
					</BreadcrumbItem>
					{selectedDevice && (
						<>
							<BreadcrumbItem>
								<span>{selectedDevice.name}</span>
							</BreadcrumbItem>
						</>
					)}
				</Breadcrumb>

				<div className='mt-5'>
					{selectedDevice ? (
						<DeviceDetail
							device={selectedDevice}
							onBack={() => setSelectedDevice(null)}
						/>
					) : (
						<DataTable
							columns={columns}
							data={devices}
							onRowClick={handleRowClick}
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
					)}
				</div>
			</div>
		</DeviceSelectionContext.Provider>
	)
}
