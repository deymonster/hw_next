import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { getLicenseStatus } from '@/app/actions/licd.actions'
import { LicenseManager } from '@/components/features/license/LicenseManager'
import { CardContainer } from '@/components/ui/elements/CardContainer'
import { Heading } from '@/components/ui/elements/Heading'
import { getVersionInfo } from '@/lib/version'

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations('dashboard.license.header')
	return {
		title: t('heading'),
		description: t('description'),
		robots: { index: false, follow: false }
	}
}

export default async function LicensePage() {
	const t = await getTranslations('dashboard.license')
	const info = await getVersionInfo()
	const statusRes = await getLicenseStatus()

	return (
		<div className='lg:px-10'>
			<Heading
				size='lg'
				title={t('header.heading')}
				description={t('header.description')}
			/>

			<div className='mt-5 space-y-6'>
				<CardContainer
					heading={t('notice.demoTitle')}
					description={t('notice.demo')}
					rightContent={
						<div className='flex flex-col items-end'>
							<span className='font-mono text-sm'>
								{info?.dockerHub?.tag ?? `v${info.version}`}
							</span>
							{info?.dockerHub?.updated && (
								<span className='text-xs text-muted-foreground'>
									{new Date(
										info.dockerHub.updated
									).toLocaleDateString('en-CA')}
								</span>
							)}
						</div>
					}
				/>

				<LicenseManager
					initialStatus={statusRes.success ? statusRes.data : null}
				/>
			</div>
		</div>
	)
}
