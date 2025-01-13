import { CreateAccountForm } from '@/components/features/auth/forms/CreateAccountForm'
import type { Metadata} from 'next'


export const metadata: Metadata = {
    title: 'Создание аккаунта'
}

export default function CreateAccountPage() {
    return <CreateAccountForm />
}