'use client'

import { CheckCircle, Loader, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { AuthWrapper } from '../AuthWrapper'

import { useAuth } from '@/hooks/useAuth'

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

	useEffect(() => {
		async function verifyEmail() {
			try {
				const res = await fetch(
					`/api/account/verify-email?token=${token}`
				)
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
					// Проверяем, является ли result.message ключом перевода
					const errorMessage =
						tErrors(result.message) ||
						result.message ||
						t('errorMesage')
					toast.error(errorMessage)
				}
			} catch (error) {
				console.error(error)
				setVerificationStatus('error')
				toast.error(t('errorMesage'))
			} finally {
				setIsVerifying(false)
			}
		}

		verifyEmail()
	}, [token, router, t, tErrors, auth])

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
							{t('errorMesage')}
						</p>
					</>
				)}
			</div>
		</AuthWrapper>
	)
}
