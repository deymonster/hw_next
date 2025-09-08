import { Device } from '@prisma/client'

import { WarrantyEditor } from '../warranty/WarrantyEditor'

import { Card, CardContent } from '@/components/ui/card'
import { DeviceMetrics } from '@/services/prometheus/prometheus.interfaces'

interface SystemSectionProps {
	systemInfo: DeviceMetrics['systemInfo'] | undefined
	device: Device
}

export function SystemSection({ systemInfo, device }: SystemSectionProps) {
	if (!systemInfo) return null

	const systemDetails = [
		{ label: 'Имя устройства', value: systemInfo.model },
		{ label: 'Производитель', value: systemInfo.manufacturer },
		{ label: 'Архитектура ОС', value: systemInfo.osArchitecture },
		{ label: 'Версия ОС', value: systemInfo.osVersion },
		{ label: 'Серийный номер', value: systemInfo.serialNumber }
	]

	return (
		<div className='space-y-4'>
			<Card>
				<CardContent className='pt-6'>
					<h3 className='mb-4 text-lg font-semibold'>
						Информация о системе
					</h3>

					<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
						{systemDetails.map(({ label, value }) => (
							<div
								key={label}
								className='flex flex-col space-y-1'
							>
								<span className='text-sm text-muted-foreground'>
									{label}
								</span>
								<span className='font-medium'>
									{value || 'N/A'}
								</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Warranty Management Section */}
			<Card>
				<CardContent className='pt-6'>
					<h3 className='mb-4 text-lg font-semibold'>
						Информация о гарантии
					</h3>
					<WarrantyEditor
						deviceId={device.id}
						currentWarrantyStatus={
							device.warrantyStatus?.toISOString() || null
						}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
