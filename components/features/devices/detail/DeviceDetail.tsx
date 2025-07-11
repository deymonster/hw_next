'use client'

import { Device } from '@prisma/client'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'

import { HardwareSection } from './hardware/HardwareSection'
import { PerformanceSection } from './perfomance/PerformanceSection'
import { ProcessList } from './process/ProcessList'
import { SystemSection } from './system/SystemSection'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDeviceAllMetrics } from '@/hooks/useDeviceAllMetrics'

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

	const handleRetry = () => {
		reconnect() // Переподключение WebSocket
	}

	// useEffect(() => {
	//   if (processes && processes.processes.length  > 0) {
	//     const firstProcess = processes.processes[0];
	//     console.log('Первый процесс:', {
	//       name: firstProcess.name,
	//       instances: firstProcess.instances,
	//       memory: `${firstProcess.metrics.memory.workingSet.toFixed(2)} MB`,
	//       cpu: `${firstProcess.metrics.cpu.toFixed(2)}%`
	//     });
	//   }
	// }, [processes]);

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
		</div>
	)
}
