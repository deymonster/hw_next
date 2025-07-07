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

// Адаптер для преобразования DeviceMetrics['networkMetrics'] в NetworkInterface[]
const adaptNetworkMetrics = (metrics: DeviceMetrics['networkMetrics']) => {
	if (!metrics) return null
	return metrics.map(metric => ({
		name: metric.name,
		status: metric.status,
		performance: {
			rx: { value: metric.performance.rx, unit: 'MB/s' },
			tx: { value: metric.performance.tx, unit: 'MB/s' }
		},
		errors: metric.errors,
		droppedPackets: metric.droppedPackets
	}))
}

export function PerformanceSection({
	processorMetrics,
	memoryMetrics,
	diskMetrics,
	networkMetrics
}: PerformanceSectionProps) {
	const adaptedNetworkMetrics = networkMetrics
		? adaptNetworkMetrics(networkMetrics)
		: null
	return (
		<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-2'>
			<Card className='h-[300px]'>
				<CardContent className='h-full pt-6'>
					<h3 className='mb-4 text-lg font-semibold'>CPU Usage</h3>
					<CpuMetrics metrics={processorMetrics} />
				</CardContent>
			</Card>

			<Card className='h-[300px]'>
				<CardContent className='h-full pt-6'>
					<h3 className='mb-4 text-lg font-semibold'>Memory Usage</h3>
					{memoryMetrics && <MemoryMetrics metrics={memoryMetrics} />}
					{!memoryMetrics && <div>No memory data available</div>}
				</CardContent>
			</Card>

			<Card className='h-[300px]'>
				<CardContent className='h-full overflow-y-auto pt-6'>
					<h3 className='mb-4 text-lg font-semibold'>Disk Usage</h3>
					{diskMetrics && <DiskMetrics metrics={diskMetrics} />}
					{!diskMetrics && <div>No disk data available</div>}
				</CardContent>
			</Card>

			<Card className='h-[300px]'>
				<CardContent className='h-full pt-6'>
					<h3 className='mb-4 text-lg font-semibold'>
						Network Usage
					</h3>
					{adaptedNetworkMetrics && (
						<NetworkMetrics metrics={adaptedNetworkMetrics} />
					)}
					{!adaptedNetworkMetrics && (
						<div>No network data available</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
