import { CircuitBoard, Cpu, HardDrive, MonitorSmartphone } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Card, CardContent } from '@/components/ui/card'
import {
	DeviceMetrics,
	DiskInfo
} from '@/services/prometheus/prometheus.interfaces'

interface HardwareSectionProps {
	hardwareInfo: DeviceMetrics['hardwareInfo'] | null | undefined
}

export function HardwareSection({ hardwareInfo }: HardwareSectionProps) {
	const t = useTranslations('dashboard.devices.detail.hardware')

	if (!hardwareInfo) return null

	const formatDiskSize = (disk: DiskInfo): string => {
		if (typeof disk.sizeGb === 'number' && !Number.isNaN(disk.sizeGb)) {
			return `${disk.sizeGb.toFixed(2)} ГБ`
		}

		const sizeInBytes = Number(disk.size)
		if (!Number.isNaN(sizeInBytes) && sizeInBytes > 0) {
			const sizeInGB = sizeInBytes / (1024 * 1024 * 1024)
			return `${sizeInGB.toFixed(2)} ГБ`
		}

		return disk.size
	}

	const gpuStatusTypes = hardwareInfo.gpus
		.map(gpu => gpu.type)
		.filter((type): type is 'integrated' | 'discrete' | 'unknown' =>
			Boolean(type)
		)

	const hasIntegrated = gpuStatusTypes.includes('integrated')
	const hasDiscrete = gpuStatusTypes.includes('discrete')
	const hasUnknown = gpuStatusTypes.includes('unknown')

	let gpuStatusLabel: string | null = null

	if (hasIntegrated && hasDiscrete) {
		gpuStatusLabel = t('graphicsStatusBoth')
	} else if (hasIntegrated) {
		gpuStatusLabel = t('graphicsStatusIntegrated')
	} else if (hasDiscrete) {
		gpuStatusLabel = t('graphicsStatusDiscrete')
	} else if (hasUnknown && gpuStatusTypes.length > 0) {
		gpuStatusLabel = t('graphicsStatusUnknown')
	}

	return (
		<div className='grid gap-4 md:grid-cols-2'>
			<Card>
				<CardContent className='pt-6'>
					<div className='space-y-6'>
						{/* BIOS */}
						<div className='flex items-start space-x-3'>
							<Cpu className='mt-1 h-5 w-5 text-muted-foreground' />
							<div>
								<h4 className='font-medium'>BIOS</h4>
								<div className='text-sm text-muted-foreground'>
									<p>{hardwareInfo.bios.manufacturer}</p>
									<p className='text-xs opacity-75'>
										{t('version')}:{' '}
										{hardwareInfo.bios.version} •{t('date')}
										: {hardwareInfo.bios.date}
									</p>
								</div>
							</div>
						</div>

						{/* CPU */}
						<div className='flex items-start space-x-3'>
							<Cpu className='mt-1 h-5 w-5 text-muted-foreground' />
							<div>
								<h4 className='font-medium'>
									{t('processor')}
								</h4>
								<p className='text-sm text-muted-foreground'>
									{hardwareInfo.cpu.model}
								</p>
							</div>
						</div>

						{/* Материнская плата */}
						<div className='flex items-start space-x-3'>
							<CircuitBoard className='mt-1 h-5 w-5 text-muted-foreground' />
							<div>
								<h4 className='font-medium'>
									{t('motherboard')}
								</h4>
								<div className='text-sm text-muted-foreground'>
									<p>
										{hardwareInfo.motherboard.manufacturer}{' '}
										{hardwareInfo.motherboard.product}
									</p>
									<p className='text-xs opacity-75'>
										{t('version')}:{' '}
										{hardwareInfo.motherboard.version} •
										S/N:{' '}
										{hardwareInfo.motherboard.serialNumber}
									</p>
								</div>
							</div>
						</div>

						{/* Memory */}
						<div className='flex items-start space-x-3'>
							<Cpu className='mt-1 h-5 w-5 text-muted-foreground' />
							<div>
								<h4 className='font-medium'>{t('memory')}</h4>
								<div className='space-y-2'>
									{hardwareInfo.memory.modules.map(
										(module, index) => {
											const details = [
												module.capacity,
												module.type,
												module.speed
											]
												.filter(Boolean)
												.join(' ')

											const extraParts: string[] = []
											if (module.serialNumber) {
												extraParts.push(
													`S/N: ${module.serialNumber}`
												)
											}
											if (module.partNumber) {
												extraParts.push(
													`P/N: ${module.partNumber}`
												)
											}

											return (
												<div
													key={index}
													className='text-sm text-muted-foreground'
												>
													{details}
													{extraParts.length > 0 && (
														<div className='text-xs opacity-75'>
															{extraParts.join(
																' • '
															)}
														</div>
													)}
												</div>
											)
										}
									)}
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className='pt-6'>
					<div className='space-y-6'>
						{/* Storage */}
						<div className='flex items-start space-x-3'>
							<HardDrive className='mt-1 h-5 w-5 text-muted-foreground' />
							<div>
								<h4 className='font-medium'>{t('storage')}</h4>
								<div className='space-y-2'>
									{hardwareInfo.disks.map((disk, index) => (
										<div
											key={index}
											className='text-sm text-muted-foreground'
										>
											{t('model')}: {disk.model}
											<div className='text-xs opacity-75'>
												{formatDiskSize(disk)} •{' '}
												{t('type')}: {disk.type} •{' '}
												{t('health')}: {disk.health}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* GPU */}
						<div className='flex items-start space-x-3'>
							<MonitorSmartphone className='mt-1 h-5 w-5 text-muted-foreground' />
							<div>
								<h4 className='font-medium'>{t('graphics')}</h4>
								{gpuStatusLabel && (
									<div className='mt-1 inline-flex items-center space-x-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground'>
										<span className='font-medium text-foreground/80'>
											{t('graphicsStatusLabel')}:
										</span>
										<span className='capitalize text-foreground'>
											{gpuStatusLabel}
										</span>
									</div>
								)}
								<div className='space-y-2'>
									{hardwareInfo.gpus.map((gpu, index) => {
										const memoryValue =
											typeof gpu.memoryGB === 'number' &&
											!Number.isNaN(gpu.memoryGB)
												? `${gpu.memoryGB.toFixed(2)} ГБ`
												: typeof gpu.memoryMB ===
															'number' &&
													  !Number.isNaN(
															gpu.memoryMB
													  )
													? `${gpu.memoryMB.toFixed(0)} МБ`
													: null

										return (
											<div
												key={index}
												className='text-sm text-muted-foreground'
											>
												{gpu.name}
												{memoryValue && (
													<div className='text-xs opacity-75'>
														{t('graphicsMemory')}:{' '}
														{memoryValue}
													</div>
												)}
											</div>
										)
									})}
								</div>
							</div>
						</div>

						{/* Сеть */}
						<div className='flex items-start space-x-3'>
							<MonitorSmartphone className='mt-1 h-5 w-5 text-muted-foreground' />
							<div>
								<h4 className='font-medium'>
									{t('networkAdapters')}
								</h4>
								<div className='space-y-2'>
									{hardwareInfo.networkInterfaces.map(
										(adapter, index) => {
											const performance =
												adapter.performance
											const performanceDetails: string[] =
												[]

											if (
												performance?.rx?.value !==
													undefined &&
												!Number.isNaN(
													performance.rx.value
												)
											) {
												performanceDetails.push(
													`Rx: ${performance.rx.value} ${
														performance.rx.unit ??
														''
													}`.trim()
												)
											}

											if (
												performance?.tx?.value !==
													undefined &&
												!Number.isNaN(
													performance.tx.value
												)
											) {
												performanceDetails.push(
													`Tx: ${performance.tx.value} ${
														performance.tx.unit ??
														''
													}`.trim()
												)
											}

											return (
												<div
													key={index}
													className='text-sm text-muted-foreground'
												>
													{adapter.name}
													{adapter.status && (
														<span className='ml-1 text-xs uppercase opacity-75'>
															[{adapter.status}]
														</span>
													)}
													{(performanceDetails.length >
														0 ||
														adapter.errors !==
															undefined ||
														adapter.droppedPackets !==
															undefined) && (
														<div className='text-xs opacity-75'>
															{performanceDetails.join(
																' • '
															)}
															{(adapter.errors !==
																undefined ||
																adapter.droppedPackets !==
																	undefined) &&
															performanceDetails.length >
																0
																? ' • '
																: ''}
															{adapter.errors !==
															undefined
																? `Err: ${adapter.errors}`
																: ''}
															{adapter.errors !==
																undefined &&
															adapter.droppedPackets !==
																undefined
																? ' '
																: ''}
															{adapter.droppedPackets !==
															undefined
																? `Drop: ${adapter.droppedPackets}`
																: ''}
														</div>
													)}
												</div>
											)
										}
									)}
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
