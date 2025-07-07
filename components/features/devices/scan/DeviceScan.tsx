'use client'

import { useTranslations } from 'next-intl'

import { ScanModal } from './forms/ScanModal'

import { Heading } from '@/components/ui/elements/Heading'

export function DeviceScan() {
	const t = useTranslations('dashboard.devices')
	return (
		<div className='lg:px-10'>
			<div className='block items-center justify-center justify-between space-y-3 lg:flex lg:space-y-0'>
				<Heading
					title={t('header.heading')}
					description={t('header.description')}
					size='lg'
				/>
				<div className='flex items-center gap-x-4'>
					<ScanModal />
				</div>
			</div>
		</div>
	)
}
