import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { NewPasswordForm } from '@/components/features/auth/forms/NewPasswordForm'

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations('auth.newPassword')

	return {
		title: t('heading')
	}
}

export default function NewPasswordPage() {
	return <NewPasswordForm />
}
