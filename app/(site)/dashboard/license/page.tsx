import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { getLicdVersion, getLicenseStatus } from '@/app/actions/licd.actions'
import { LicenseManager } from '@/components/features/license/LicenseManager'
import { VersionInfoModal } from '@/components/features/license/VersionInfoModal'
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
	const licdVersion = await getLicdVersion()
	const statusRes = await getLicenseStatus()

	return (
		<div className='lg:px-10'>
			<div className='flex items-start justify-between'>
				<Heading
					size='lg'
					title={t('header.heading')}
					description={t('header.description')}
				/>
				<VersionInfoModal info={info} licdVersion={licdVersion} />
			</div>

			<div className='mt-5 space-y-6'>
				<LicenseManager
					initialStatus={statusRes.success ? statusRes.data : null}
				/>
			</div>
		</div>
	)
}
