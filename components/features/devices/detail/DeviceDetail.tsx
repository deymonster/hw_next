'use client'

import { Device } from '@prisma/client'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { HardwareChangeConfirmModal } from '../hardware-change/HardwareChangeConfirmModal'
import { HardwareSection } from './hardware/HardwareSection'
import { PerformanceSection } from './perfomance/PerformanceSection'
import { ProcessList } from './process/ProcessList'
import { SystemSection } from './system/SystemSection'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDeviceAllMetrics } from '@/hooks/useDeviceAllMetrics'
import { useHardwareChangeEvents } from '@/hooks/useHardwareChangeEvents'

interface DeviceDetailProps {
	device: Device
	onBack: () => void
}

export function DeviceDetail({ device, onBack }: DeviceDetailProps) {
	// Используем тот же хук для получения метрик
	const {
		metrics: {
			system,
			hardware,
			processorMetrics,
			diskMetrics,
			memoryMetrics,
			networkMetrics,
			processes,
			lastUpdated
		},
		status: { sseConnecting, wsConnected, wsLoading },
		errors: { sseError, processError },
		actions: { reconnect }
	} = useDeviceAllMetrics(device.ipAddress)

	// Хуки для управления модальным окном изменения оборудования
	const { hasUnconfirmedEvents, refetch } = useHardwareChangeEvents(device.id)
	const [isModalOpen, setIsModalOpen] = useState(false)

	const handleRetry = () => {
		reconnect() // Переподключение WebSocket
	}

	const getErrorMessage = (error: string | Error | null): string => {
		if (!error) return ''
		if (error instanceof Error) {
			if (error.message.includes('Failed to fetch')) {
				return 'Unable to connect to the device. Please check if the device is online.'
			}
			return error.message
		}
		return error
	}

	const handleModalSuccess = () => {
		setIsModalOpen(false)
		refetch() // Обновляем список событий
	}

	return (
		<div className='space-y-6' data-device={device.ipAddress}>
			{/* Header */}
			<div className='flex items-center space-x-4'>
				<Button variant='outline' size='icon' onClick={onBack}>
					<ArrowLeft className='h-4 w-4' />
				</Button>
				<div>
					<h2 className='text-2xl font-bold'>{device.name}</h2>
					<p className='text-muted-foreground'>{device.ipAddress}</p>
				</div>
			</div>

			{/* Error State - обновлен для обоих типов ошибок */}
			{(sseError || processError) && (
				<Card>
					<CardContent className='pt-6'>
						<div className='flex items-center space-x-2 text-red-500'>
							<AlertCircle className='h-5 w-5' />
							<span>
								{getErrorMessage(sseError || processError)}
							</span>
							<Button
								variant='outline'
								size='icon'
								onClick={handleRetry}
							>
								Try Again
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Loading States - разделяем состояния */}
			{sseConnecting && (
				<Card>
					<CardContent className='pt-6'>
						<div className='flex items-center space-x-2'>
							<RefreshCw className='h-4 w-4 animate-spin' />
							<span>Connecting to device...</span>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Уведомление об изменениях оборудования */}
			{hasUnconfirmedEvents && (
				<Card className='border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'>
					<CardContent className='pt-6'>
						<div className='flex items-center justify-between'>
							<div className='flex items-center gap-2'>
								<AlertCircle className='h-5 w-5 text-amber-600 dark:text-amber-400' />
								<span className='font-medium text-amber-800 dark:text-amber-200'>
									Обнаружены изменения в конфигурации
									оборудования
								</span>
							</div>
							<Button
								onClick={() => setIsModalOpen(true)}
								variant='outline'
								className='border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/20'
							>
								Подтвердить изменения
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Metrics Content */}
			{!sseError && (
				<Tabs defaultValue='system'>
					<TabsList className='grid w-full grid-cols-4'>
						<TabsTrigger value='system'>System</TabsTrigger>
						<TabsTrigger value='hardware'>Hardware</TabsTrigger>
						<TabsTrigger value='performance'>
							Performance
						</TabsTrigger>
						<TabsTrigger value='processes'>Processes</TabsTrigger>
					</TabsList>

					<TabsContent value='system'>
						<SystemSection systemInfo={system} />
					</TabsContent>

					<TabsContent value='hardware'>
						<HardwareSection hardwareInfo={hardware} />
					</TabsContent>

					<TabsContent value='performance'>
						<PerformanceSection
							processorMetrics={processorMetrics || null}
							memoryMetrics={memoryMetrics || null}
							diskMetrics={diskMetrics || null}
							networkMetrics={networkMetrics || null}
						/>
					</TabsContent>

					<TabsContent value='processes'>
						{wsLoading ? (
							<Card>
								<CardContent className='pt-6'>
									<div className='flex items-center space-x-2'>
										<RefreshCw className='h-4 w-4 animate-spin' />
										<span>Loading process data...</span>
									</div>
								</CardContent>
							</Card>
						) : (
							<ProcessList
								deviceId={device.ipAddress}
								data={processes}
								isLoading={wsLoading}
								isConnected={wsConnected}
								error={processError}
								lastUpdated={lastUpdated}
								onReconnect={reconnect}
							/>
						)}
					</TabsContent>
				</Tabs>
			)}

			{/* Модальное окно подтверждения изменений оборудования */}
			<HardwareChangeConfirmModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				device={device}
				onSuccess={handleModalSuccess}
			/>
		</div>
	)
}
