'use client'

import { CheckCircle, Loader, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { AuthWrapper } from '../AuthWrapper'

import { useAuth } from '@/hooks/useAuth'
import { AUTH_ROUTES } from '@/libs/auth/constants'

interface VerifyAccountFormProps {
	token: string
}

export function VerifyAccountForm({ token }: VerifyAccountFormProps) {
	const t = useTranslations('auth.verify')
	const tErrors = useTranslations('auth.errors')
	const { auth } = useAuth()
	const router = useRouter()
	const [isVerifying, setIsVerifying] = useState(true)
	const [verificationStatus, setVerificationStatus] = useState<
		'pending' | 'success' | 'error'
	>('pending')

	// Флаг для предотвращения повторных запросов подтверждения
	const hasRequested = useRef(false)

	useEffect(() => {
		// Если уже отправляли запрос — выходим
		if (hasRequested.current) return
		hasRequested.current = true

		async function verifyEmail() {
			try {
				const res = await fetch(
					`${AUTH_ROUTES.API.VERIFY_EMAIL}?token=${token}`
				)

				// Новая часть: проверяем статус ответа прежде чем читать JSON
				if (!res.ok) {
					setVerificationStatus('error')
					toast.error(t('errorMessage'))
					return
				}

				const result = await res.json()

				if (result.success) {
					auth()
					setVerificationStatus('success')
					toast.success(t('successMessage'))
					setTimeout(() => {
						router.push('/account/login')
					}, 2000)
				} else {
					setVerificationStatus('error')
					const errorKey =
						result?.message ?? 'EMAIL_VERIFICATION_ERROR'
					const errorMessage = tErrors(errorKey) || t('errorMessage')
					toast.error(errorMessage)
				}
			} catch (error) {
				console.error(error)
				setVerificationStatus('error')
				toast.error(t('errorMessage'))
			} finally {
				setIsVerifying(false)
			}
		}

		verifyEmail()
	}, [token])

	return (
		<AuthWrapper heading={t('heading')}>
			<div className='flex flex-col items-center space-y-4'>
				{isVerifying && (
					<>
						<Loader className='size-8 animate-spin' />
						<p className='text-sm text-muted-foreground'>
							{t('verifying')}
						</p>
					</>
				)}

				{!isVerifying && verificationStatus === 'success' && (
					<>
						<CheckCircle className='size-8 text-green-500' />
						<p className='text-sm text-green-600'>
							{t('successMessage')}
						</p>
						<p className='text-xs text-muted-foreground'>
							{t('redirecting')}
						</p>
					</>
				)}

				{!isVerifying && verificationStatus === 'error' && (
					<>
						<XCircle className='size-8 text-red-500' />
						<p className='text-sm text-red-600'>
							{t('errorMessage')}
						</p>
					</>
				)}
			</div>
		</AuthWrapper>
	)
}
