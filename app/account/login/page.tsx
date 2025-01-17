import { LoginForm } from '@/components/features/auth/forms/LoginForm'
import type { Metadata} from 'next'
import { getTranslations } from 'next-intl/server'



export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('auth.login')

    return {
        title: t('heading')
    }
}

export default function LoginPage() {
    return <LoginForm />
}
