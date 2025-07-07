import { Progress } from '@/components/ui/progress'
import { DeviceMetrics } from '@/services/prometheus/prometheus.interfaces'

interface CpuMetricsProps {
	metrics: DeviceMetrics['processorMetrics'] | null
}

export function CpuMetrics({ metrics }: CpuMetricsProps) {
	if (!metrics) return <div>No CPU data available</div>

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<div className='space-y-1'>
					<p className='text-sm font-medium'>CPU Load</p>
					<p className='text-2xl font-bold'>
						{metrics.usage.toFixed(1)}%
					</p>
				</div>
				<Progress value={metrics.usage} className='w-1/2' />
			</div>

			<div className='grid grid-cols-2 gap-4 pt-4'>
				<div className='space-y-1'>
					<p className='text-sm font-medium text-muted-foreground'>
						Temperature
					</p>
					<p className='text-lg font-medium'>
						{metrics.temperature.average}°C
					</p>
				</div>
			</div>
		</div>
	)
}
