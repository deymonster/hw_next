import { useTranslations } from 'next-intl'

import { CpuMetrics } from './metrics/CpuMetrics'
import { DiskMetrics } from './metrics/DiskMetrics'
import { MemoryMetrics } from './metrics/MemoryMetrics'
import { NetworkMetrics } from './metrics/NetworkMetrics'

import { Card, CardContent } from '@/components/ui/card'
import { DeviceMetrics } from '@/services/prometheus/prometheus.interfaces'

interface PerformanceSectionProps {
	processorMetrics: DeviceMetrics['processorMetrics'] | null
	memoryMetrics: DeviceMetrics['memoryMetrics'] | null
	diskMetrics: DeviceMetrics['diskMetrics'] | null
	networkMetrics: DeviceMetrics['networkMetrics'] | null
}

export function PerformanceSection({
	processorMetrics,
	memoryMetrics,
	diskMetrics,
	networkMetrics
}: PerformanceSectionProps) {
	const t = useTranslations('dashboard.devices.detail.performance')

	return (
		<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-2'>
			<Card className='h-[300px]'>
				<CardContent className='h-full pt-6'>
					<h3 className='mb-4 text-lg font-semibold'>
						{t('cpuUsage')}
					</h3>
					<CpuMetrics metrics={processorMetrics} />
				</CardContent>
			</Card>

			<Card className='h-[300px]'>
				<CardContent className='h-full pt-6'>
					<h3 className='mb-4 text-lg font-semibold'>
						{t('memoryUsage')}
					</h3>
					{memoryMetrics && <MemoryMetrics metrics={memoryMetrics} />}
					{!memoryMetrics && <div>{t('noDataAvailable')}</div>}
				</CardContent>
			</Card>

			<Card className='h-[300px]'>
				<CardContent className='h-full overflow-y-auto pt-6'>
					<h3 className='mb-4 text-lg font-semibold'>
						{t('diskUsage')}
					</h3>
					{diskMetrics && <DiskMetrics metrics={diskMetrics} />}
					{!diskMetrics && <div>{t('noDataAvailable')}</div>}
				</CardContent>
			</Card>

			<Card className='h-[300px]'>
				<CardContent className='h-full pt-6'>
					<h3 className='mb-4 text-lg font-semibold'>
						{t('networkUsage')}
					</h3>
					{networkMetrics && (
						<NetworkMetrics metrics={networkMetrics} />
					)}
					{!networkMetrics && <div>{t('noDataAvailable')}</div>}
				</CardContent>
			</Card>
		</div>
	)
}
