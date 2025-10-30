import { useTranslations } from 'next-intl'

interface NetworkPerformanceMetric {
	value: number
	unit: string
}

interface NetworkPerformance {
	rx: NetworkPerformanceMetric
	tx: NetworkPerformanceMetric
}

interface NetworkInterface {
	name: string
	status: string
	performance: NetworkPerformance
	errors: number
	droppedPackets: number
}

interface NetworkMetricsProps {
	metrics: NetworkInterface[]
}

export function NetworkMetrics({ metrics }: NetworkMetricsProps) {
	const t = useTranslations('dashboard.devices.detail.performance')

	if (!metrics) return <div>{t('noNetworkData')}</div>

	if (!Array.isArray(metrics)) {
		console.log('Metrics is not an array')
		return <div>{t('invalidNetworkData')}</div>
	}

	if (metrics.length === 0) {
		console.log('Metrics array is empty')
		return <div>{t('noNetworkInterfaces')}</div>
	}

	return (
		<div className='space-y-6'>
			{metrics.map((network, index) => (
				<div key={network.name} className='space-y-4'>
					{index > 0 && <hr className='my-4' />}

					<div className='mb-2 flex items-center justify-between'>
						<h4 className='text-sm font-semibold'>
							{network.name}
						</h4>
						<span
							className={`rounded-full px-2 py-1 text-xs ${
								network.status === 'up'
									? 'bg-green-100 text-green-700'
									: 'bg-red-100 text-red-700'
							}`}
						>
							{network.status === 'up'
								? t('networkStatusUp')
								: t('networkStatusDown')}
						</span>
					</div>

					<div className='grid grid-cols-2 gap-4'>
						<div className='space-y-1'>
							<p className='text-sm font-medium text-muted-foreground'>
								{t('download')}
							</p>
							<p className='text-2xl font-bold'>
								{`${network.performance.rx.value} ${network.performance.rx.unit}`}
							</p>
						</div>
						<div className='space-y-1'>
							<p className='text-sm font-medium text-muted-foreground'>
								{t('upload')}
							</p>
							<p className='text-2xl font-bold'>
								{`${network.performance.tx.value} ${network.performance.tx.unit}`}
							</p>
						</div>
					</div>

					{(network.errors > 0 || network.droppedPackets > 0) && (
						<div className='mt-2 grid grid-cols-2 gap-4'>
							<div className='space-y-1'>
								<p className='text-sm font-medium text-muted-foreground'>
									{t('networkErrors')}
								</p>
								<p className='text-lg font-medium text-red-500'>
									{network.errors}
								</p>
							</div>
							<div className='space-y-1'>
								<p className='text-sm font-medium text-muted-foreground'>
									{t('droppedPackets')}
								</p>
								<p className='text-lg font-medium text-yellow-500'>
									{network.droppedPackets}
								</p>
							</div>
						</div>
					)}
				</div>
			))}
		</div>
	)
}
