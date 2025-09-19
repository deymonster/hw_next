import { Device } from '@prisma/client'
import { useTranslations } from 'next-intl'

import { WarrantyEditor } from '../warranty/WarrantyEditor'

import { Card, CardContent } from '@/components/ui/card'
import { DeviceMetrics } from '@/services/prometheus/prometheus.interfaces'

interface SystemSectionProps {
	systemInfo: DeviceMetrics['systemInfo'] | undefined
	device: Device
}

export function SystemSection({ systemInfo, device }: SystemSectionProps) {
	const t = useTranslations('dashboard.devices.detail.system')

	if (!systemInfo) return null

	const systemDetails = [
		{ label: t('deviceName'), value: systemInfo.model },
		{ label: t('manufacturer'), value: systemInfo.manufacturer },
		{ label: t('osArchitecture'), value: systemInfo.osArchitecture },
		{ label: t('osVersion'), value: systemInfo.osVersion },
		{ label: t('serialNumber'), value: systemInfo.serialNumber }
	]

	return (
		<div className='space-y-4'>
			<Card>
				<CardContent className='pt-6'>
					<h3 className='mb-4 text-lg font-semibold'>{t('title')}</h3>

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

			<Card>
				<CardContent className='pt-6'>
					<h3 className='mb-4 text-lg font-semibold'>
						{t('warranty.title')}
					</h3>
					<WarrantyEditor
						deviceId={device.id}
						initialPurchaseDate={
							device.purchaseDate
								? device.purchaseDate.toISOString()
								: null
						}
						initialWarrantyPeriod={device.warrantyPeriod ?? null}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
