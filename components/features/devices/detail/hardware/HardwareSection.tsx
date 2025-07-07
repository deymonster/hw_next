import { CircuitBoard, Cpu, HardDrive, MonitorSmartphone } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { DeviceMetrics } from '@/services/prometheus/prometheus.interfaces'

interface HardwareSectionProps {
	hardwareInfo: DeviceMetrics['hardwareInfo'] | null | undefined
}

export function HardwareSection({ hardwareInfo }: HardwareSectionProps) {
	if (!hardwareInfo) return null

	const formatSize = (size: string): string => {
		const sizeInBytes = parseInt(size)
		if (isNaN(sizeInBytes)) return size

		const sizeInGB = sizeInBytes / (1024 * 1024 * 1024)
		return `${sizeInGB.toFixed(2)} ГБ`
	}

	return (
		<div className='grid gap-4 md:grid-cols-2'>
			{/* Системные компоненты */}
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
										Версия: {hardwareInfo.bios.version} •
										Дата: {hardwareInfo.bios.date}
									</p>
								</div>
							</div>
						</div>

						{/* CPU */}
						<div className='flex items-start space-x-3'>
							<Cpu className='mt-1 h-5 w-5 text-muted-foreground' />
							<div>
								<h4 className='font-medium'>Процессор</h4>
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
									Материнская плата
								</h4>
								<div className='text-sm text-muted-foreground'>
									<p>
										{hardwareInfo.motherboard.manufacturer}{' '}
										{hardwareInfo.motherboard.product}
									</p>
									<p className='text-xs opacity-75'>
										Версия:{' '}
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
								<h4 className='font-medium'>Memory</h4>
								<div className='space-y-2'>
									{hardwareInfo.memory.modules.map(
										(module, index) => (
											<div
												key={index}
												className='text-sm text-muted-foreground'
											>
												{module.capacity} {module.speed}
												<div className='text-xs opacity-75'>
													S/N: {module.serial_number}{' '}
													• P/N: {module.part_number}
												</div>
											</div>
										)
									)}
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Хранилище, GPU и сеть */}
			<Card>
				<CardContent className='pt-6'>
					<div className='space-y-6'>
						{/* Storage */}
						<div className='flex items-start space-x-3'>
							<HardDrive className='mt-1 h-5 w-5 text-muted-foreground' />
							<div>
								<h4 className='font-medium'>Storage</h4>
								<div className='space-y-2'>
									{hardwareInfo.disks.map((disk, index) => (
										<div
											key={index}
											className='text-sm text-muted-foreground'
										>
											Модель: {disk.model}
											<div className='text-xs opacity-75'>
												{formatSize(disk.size)} • Тип:{' '}
												{disk.type} • Состояние:{' '}
												{disk.health}
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
								<h4 className='font-medium'>Graphics</h4>
								<div className='space-y-2'>
									{hardwareInfo.gpus.map((gpu, index) => (
										<div
											key={index}
											className='text-sm text-muted-foreground'
										>
											{gpu.name}
											<div className='text-xs opacity-75'>
												Память: {gpu.memory.total} Мб
											</div>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* Сеть */}
						<div className='flex items-start space-x-3'>
							<MonitorSmartphone className='mt-1 h-5 w-5 text-muted-foreground' />
							<div>
								<h4 className='font-medium'>
									Сетевые адаптеры
								</h4>
								<div className='space-y-2'>
									{hardwareInfo.network.map(
										(adapter, index) => (
											<div
												key={index}
												className='text-sm text-muted-foreground'
											>
												{adapter.name}
											</div>
										)
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
