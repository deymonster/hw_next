import { ResetPasswordForm } from '@/components/features/auth/forms/ResetPasswordForm'
import type { Metadata} from 'next'
import { getTranslations } from 'next-intl/server'



export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('auth.resetPassword')

    return {
        title: t('heading')
    }
}

export default function ResetPasswordPage() {
    return <ResetPasswordForm />
}
