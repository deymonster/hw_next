import { Progress } from '@/components/ui/progress'
import { DeviceMetrics } from '@/services/prometheus/prometheus.interfaces'

interface MemoryMetricsProps {
	metrics: DeviceMetrics['memoryMetrics']
}

export function MemoryMetrics({ metrics }: MemoryMetricsProps) {
	if (!metrics) return <div>No memory data available</div>

	const usagePercent = (metrics.used / metrics.total) * 100

	const formatMemory = (value: number): string => {
		if (value >= 1024) {
			return `${(value / 1024).toFixed(2)} GB`
		}
		return `${value.toFixed(2)} MB`
	}

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<div className='space-y-1'>
					<p className='text-sm font-medium'>Memory Used</p>
					<p className='text-2xl font-bold'>
						{usagePercent.toFixed(1)}%
					</p>
				</div>
				<Progress value={usagePercent} className='w-1/2' />
			</div>

			<div className='grid grid-cols-2 gap-4 pt-4'>
				<div className='space-y-1'>
					<p className='text-sm font-medium text-muted-foreground'>
						Used
					</p>
					<p className='text-lg font-medium'>
						{formatMemory(metrics.used)}
					</p>
				</div>
				<div className='space-y-1'>
					<p className='text-sm font-medium text-muted-foreground'>
						Total
					</p>
					<p className='text-lg font-medium'>
						{formatMemory(metrics.total)}
					</p>
				</div>
			</div>
		</div>
	)
}
