'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
	changeEmailSchema,
	type TypeChangeEmailSchema
} from '@/schemas/user/change-email.schema'

import { Button } from '@/components/ui/button'
import { FormWrapper } from '@/components/ui/elements/FormWrapper'
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser } from '@/hooks/useUser'

type EmailChangeState = 'idle' | 'verification_sent' | 'verified' | 'changing'

export function ChangeEmailForm() {
	const t = useTranslations('dashboard.settings.account.email')
	const {
		user,
		loading: isLoadingProfile,
		initiateChangeEmail,
		verifyEmailCode,
		confirmEmailUpdate
	} = useUser()
	const [isPending, startTransition] = useTransition()
	const [changeState, setChangeState] = useState<EmailChangeState>('idle')

	const form = useForm<TypeChangeEmailSchema>({
		resolver: zodResolver(changeEmailSchema),
		values: {
			newEmail: user?.email ?? '',
			verificationCode: ''
		}
	})

	const { isValid, isDirty } = form.formState
	const newEmail = form.watch('newEmail')
	const verificationCode = form.watch('verificationCode')

	// Шаг 1: Отправка кода подтверждения на текущий email
	async function handleSendVerification() {
		if (!isValid || !isDirty) return

		startTransition(async () => {
			await initiateChangeEmail(newEmail, {
				onSuccess: () => {
					setChangeState('verification_sent')
					toast.success(t('verificationSentMessage'))
				},
				onError: () => toast.error(t('errorSendingVerification'))
			})
		})
	}

	// Шаг 2: Проверка кода подтверждения
	async function handleVerifyCode() {
		if (!verificationCode) return

		startTransition(async () => {
			await verifyEmailCode(verificationCode, {
				onSuccess: () => {
					setChangeState('verified')
					toast.success(t('codeVerifiedMessage'))
				},
				onError: () => toast.error(t('errorVerifyingCode'))
			})
		})
	}

	// Шаг 3: Финальное подтверждение и смена email
	async function handleConfirmChange() {
		startTransition(async () => {
			await confirmEmailUpdate({
				onSuccess: () => {
					toast.success(t('successMessage'))
					setChangeState('idle')
					form.reset()
				},
				onError: () => toast.error(t('errorMessage'))
			})
		})
	}

	if (isLoadingProfile) return <ChangeEmailFormSkeleton />

	return (
		<FormWrapper heading={t('heading')}>
			<Form {...form}>
				<form className='grid gap-y-3'>
					<FormField
						control={form.control}
						name='newEmail'
						render={({ field }) => (
							<FormItem className='px-5'>
								<FormLabel>{t('emailLabel')}</FormLabel>
								<FormControl>
									<Input
										placeholder='username@example.com'
										disabled={
											isPending || changeState !== 'idle'
										}
										{...field}
									/>
								</FormControl>
								<FormDescription>
									{t('emailDescription')}
								</FormDescription>
							</FormItem>
						)}
					/>

					{(changeState === 'verification_sent' ||
						changeState === 'verified') && (
						<FormField
							control={form.control}
							name='verificationCode'
							render={({ field }) => (
								<FormItem className='px-5'>
									<FormLabel>
										{t('verificationCodeLabel')}
									</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												'verificationCodePlaceholder'
											)}
											disabled={
												isPending ||
												changeState === 'verified'
											}
											{...field}
										/>
									</FormControl>
									<FormDescription>
										{t('verificationCodeDescription')}
									</FormDescription>
								</FormItem>
							)}
						/>
					)}

					<Separator />

					<div className='flex justify-end p-5'>
						{changeState === 'idle' ? (
							<Button
								onClick={handleSendVerification}
								disabled={!isValid || !isDirty || isPending}
							>
								{isPending ? (
									<>
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									</>
								) : (
									t('sendVerificationButton')
								)}
							</Button>
						) : (
							<div className='flex gap-x-3'>
								<Button
									variant='outline'
									onClick={() => {
										setChangeState('idle')
										form.setValue('verificationCode', '')
									}}
									disabled={isPending}
								>
									{t('cancelButton')}
								</Button>
								{changeState === 'verification_sent' ? (
									<Button
										onClick={handleVerifyCode}
										disabled={
											!verificationCode || isPending
										}
									>
										{isPending ? (
											<>
												<Loader2 className='mr-2 h-4 w-4 animate-spin' />
											</>
										) : (
											t('verifyCodeButton')
										)}
									</Button>
								) : (
									<Button
										onClick={handleConfirmChange}
										disabled={isPending}
									>
										{isPending ? (
											<>
												<Loader2 className='mr-2 h-4 w-4 animate-spin' />
											</>
										) : (
											t('submitButton')
										)}
									</Button>
								)}
							</div>
						)}
					</div>
				</form>
			</Form>
		</FormWrapper>
	)
}

export function ChangeEmailFormSkeleton() {
	return <Skeleton className='h-64 w-full' />
}
