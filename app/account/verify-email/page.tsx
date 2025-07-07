import { redirect } from 'next/navigation'

import { VerifyAccountForm } from '@/components/features/auth/forms/VerifyAccountForm'

export default async function VerifyEmailPage(props: {
	searchParams: Promise<{ token: string }>
}) {
	const searchParams = await props.searchParams

	if (!searchParams.token) {
		return redirect('/account/create')
	}

	return (
		<div className='flex min-h-screen items-center justify-center p-4'>
			<VerifyAccountForm token={searchParams.token} />
		</div>
	)
}
