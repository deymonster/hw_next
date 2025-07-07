'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
	newPasswordSchema,
	type TypeNewPasswordSchema
} from '@/schemas/auth/new-password.schema'

import { AuthWrapper } from '../AuthWrapper'

import { updatePasswordWithToken } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { AUTH_ERRORS } from '@/libs/auth/constants'

export function NewPasswordForm() {
	const router = useRouter()
	const t = useTranslations('auth.newPassword')
	const params = useParams<{ token: string }>()
	const token = params.token

	const form = useForm<TypeNewPasswordSchema>({
		resolver: zodResolver(newPasswordSchema),
		defaultValues: {
			password: '',
			passwordRepeat: ''
		}
	})

	const { isValid, isSubmitting } = form.formState

	const onSubmit = async (data: TypeNewPasswordSchema) => {
		try {
			if (!token) {
				toast.error(t('errorMessage'))
				return
			}

			const result = await updatePasswordWithToken(token, data)
			if (result.error === AUTH_ERRORS.INVALID_TOKEN) {
				toast.error(t('invalidToken'))
				return
			}

			toast.success(t('successMessage'))
			router.push('/account/login')
		} catch (error) {
			toast.error(t('errorMessage'))
			console.error('New password error', error)
		}
	}
	return (
		<AuthWrapper
			heading={t('heading')}
			backButtonLabel={t('backButtonLabel')}
			backButtonHref='/account/login'
		>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className='grid gap-y-3'
				>
					<FormField
						control={form.control}
						name='password'
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t('passwordLabel')}</FormLabel>
								<FormControl>
									<Input
										{...field}
										type='password'
										placeholder='********'
										disabled={isSubmitting}
									/>
								</FormControl>
								<FormDescription>
									{t('passwordDescription')}
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name='passwordRepeat'
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									{t('passwordRepeatLabel')}
								</FormLabel>
								<FormControl>
									<Input
										{...field}
										type='password'
										placeholder='********'
										disabled={isSubmitting}
									/>
								</FormControl>
								<FormDescription>
									{t('passwordRepeatDescription')}
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button
						className='mt-2 w-full'
						disabled={!isValid || isSubmitting}
						type='submit'
					>
						{t('submitButton')}
					</Button>
				</form>
			</Form>
		</AuthWrapper>
	)
}
