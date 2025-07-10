'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { loginSchema, type TypeLoginSchema } from '@/schemas/auth/login.schema'

import { AuthWrapper } from '../AuthWrapper'

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
import { useAuth } from '@/hooks/useAuth'

export function LoginForm() {
	const { auth, login } = useAuth()
	const searchParams = useSearchParams()
	const t = useTranslations('auth.login')
	const errors = useTranslations('auth.errors')
	const [isLoadingLogin, setIsLoadingLogin] = useState(false)
	const [isSubmitted, setIsSubmitted] = useState(false)

	const form = useForm<TypeLoginSchema>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: '',
			password: ''
		}
	})

	const { isValid } = form.formState

	const onSubmit = async (data: TypeLoginSchema) => {
		try {
			setIsLoadingLogin(true)
			setIsSubmitted(true)
			
			// Получаем маршрут откуда пришел пользователь
			const from = searchParams.get('from') || undefined
			console.log('Authenticating...')
			const result = await login(data.email, data.password, from)
			console.log('Authentication result:', result)

			if (result.error) {
				toast.error(errors(result.error))
				setIsSubmitted(false)
				return
			}

			if (result.success && result.callbackUrl) {
				console.log('Authentication successful, setting auth state')
				toast.success(t('successMessage'))
			} else {
				toast.error(t('errorMessage'))
				setIsSubmitted(false)
			}
		} catch (error) {
			console.error('Login error:', error)
			toast.error(t('errorMessage'))
			setIsSubmitted(false)
		} finally {
			setIsLoadingLogin(false)
		}
	}

	// Если форма отправлена, показываем спиннер на весь экран
	if (isSubmitted) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
			</div>
		)
	}

	return (
		<AuthWrapper
			heading={t('heading')}
			backButtonLabel={t('backButtonLabel')}
			backButtonHref='/account/create'
		>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className='grid gap-y-3'
				>
					<FormField
						control={form.control}
						name='email'
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t('loginLabel')}</FormLabel>
								<FormControl>
									<Input
										{...field}
										type='email'
										placeholder='email@example.com'
										disabled={isLoadingLogin}
									/>
								</FormControl>
								<FormDescription>
									{t('loginDescription')}
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='password'
						render={({ field }) => (
							<FormItem>
								<div className='flex items-center justify-between'>
									<FormLabel>{t('passwordLabel')}</FormLabel>
									<Link
										href='recovery'
										className='ml-auto inline-block text-sm'
									>
										{t('forgotPassword')}
									</Link>
								</div>
								<FormControl>
									<Input
										{...field}
										type='password'
										disabled={isLoadingLogin}
									/>
								</FormControl>
								<FormDescription>
									{t('passwordDescription')}
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button
						className='mt-2 w-full'
						disabled={!isValid || isLoadingLogin}
						type='submit'
					>
						{t('submitButton')}
					</Button>
				</form>
			</Form>
		</AuthWrapper>
	)
}
