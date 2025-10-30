import { useTranslations } from 'next-intl'

import { Progress } from '@/components/ui/progress'
import { DeviceMetrics } from '@/services/prometheus/prometheus.interfaces'

interface CpuMetricsProps {
	metrics: DeviceMetrics['processorMetrics'] | null
}

export function CpuMetrics({ metrics }: CpuMetricsProps) {
	const t = useTranslations('dashboard.devices.detail.performance')

	if (!metrics) return <div>{t('noCpuData')}</div>

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<div className='space-y-1'>
					<p className='text-sm font-medium'>{t('cpuLoad')}</p>
					<p className='text-2xl font-bold'>
						{metrics.usage.toFixed(1)}%
					</p>
				</div>
				<Progress value={metrics.usage} className='w-1/2' />
			</div>

			<div className='grid grid-cols-2 gap-4 pt-4'>
				<div className='space-y-1'>
					<p className='text-sm font-medium text-muted-foreground'>
						{t('temperature')}
					</p>
					<p className='text-lg font-medium'>
						{metrics.temperature.average}°C
					</p>
				</div>
			</div>
		</div>
	)
}
