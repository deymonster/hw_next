'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { SmtpProvider } from '@prisma/client'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
	changeSmtpSettingsSchema,
	TypeChangeSmtpSettingsSchema
} from '@/schemas/user/change-smtp.schema'

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useSmtpSettings } from '@/hooks/useSmtpSettings'
import { SMTP_PROVIDER_DEFAULTS } from '@/services/smtp-settings/smtp-settiings.constants'

const providers = {
	GMAIL: 'Gmail',
	MAIL: 'Mail.ru',
	YANDEX: 'Yandex',
	CUSTOM: 'Custom'
}

export function ChangeSmtpSettingsForm() {
	const t = useTranslations('dashboard.settings.smtpSettings')
	const {
		settings,
		isLoading,
		fetchSettings,
		updateSettings,
		testConnection
	} = useSmtpSettings()
	const [isTestingEmail, setIsTestingEmail] = useState(false)

	const form = useForm<TypeChangeSmtpSettingsSchema>({
		resolver: zodResolver(changeSmtpSettingsSchema),
		values: {
			provider: settings?.provider ?? 'CUSTOM',
			host: settings?.host ?? '',
			port: settings?.port ?? 587,
			secure: settings?.secure ?? false,
			username: settings?.username ?? '',
			password: settings?.password ?? '',
			fromEmail: settings?.fromEmail ?? '',
			fromName: settings?.fromName ?? ''
		}
	})

	useEffect(() => {
		fetchSettings({
			onError: error => {
				console.error(error)
				toast.error(t('errorMessage'))
			}
		})
	}, [fetchSettings, t])

	async function onProviderChange(provider: SmtpProvider) {
		form.setValue('provider', provider)

		const providerSettings = SMTP_PROVIDER_DEFAULTS[provider]
		if (providerSettings) {
			form.setValue('host', providerSettings.host ?? '')
			form.setValue('port', providerSettings.port ?? 587)
			form.setValue('secure', providerSettings.secure ?? false)
		}
	}

	async function onSubmit(data: TypeChangeSmtpSettingsSchema) {
		console.log(
			'[SMTP_FORM] Submitting form with password length:',
			data.password?.length
		)
		console.log('[SMTP_FORM] Submitting form with password:', data.password)
		await updateSettings(data, {
			onSuccess: () => {
				toast.success(t('succesMessage'))
			},
			onError: () => {
				toast.error(t('errorMessage'))
			}
		})
	}

	async function handleTestConnection() {
		const formData = form.getValues()
		setIsTestingEmail(true)

		try {
			await testConnection(
				{
					host: formData.host,
					port: formData.port,
					secure: formData.secure,
					username: formData.username,
					password: formData.password
				},
				{
					onSuccess: () => {
						toast.success(t('testSuccess'))
					},
					onError: error => {
						if (error instanceof Error) {
							toast.error(error.message)
						} else {
							toast.error(t('testError'))
						}
					}
				}
			)
		} finally {
			setIsTestingEmail(false)
		}
	}

	return (
		<FormWrapper heading={t('header.heading')}>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className='grid gap-y-3'
				>
					<FormField
						control={form.control}
						name='provider'
						render={({ field }) => (
							<FormItem className='px-5'>
								<div className='flex items-center justify-between'>
									<FormLabel>
										{t('provider.heading')}
									</FormLabel>
									<Select
										onValueChange={value =>
											onProviderChange(
												value as SmtpProvider
											)
										}
										value={field.value}
									>
										<SelectTrigger className='w-[190px]'>
											<SelectValue
												placeholder={t(
													'provider.selectPlaceholder'
												)}
											/>
										</SelectTrigger>
										<SelectContent>
											{Object.entries(providers).map(
												([value, label]) => (
													<SelectItem
														key={value}
														value={value}
														disabled={isLoading}
													>
														{label}
													</SelectItem>
												)
											)}
										</SelectContent>
									</Select>
								</div>
								<FormDescription>
									{t('provider.description')}
								</FormDescription>
							</FormItem>
						)}
					/>

					<Separator />

					{/* Host */}

					<FormField
						control={form.control}
						name='host'
						render={({ field }) => (
							<FormItem className='px-5'>
								{/* <div className='flex items-center justify-between'> */}
								<FormLabel>{t('smtpHost.heading')}</FormLabel>
								<FormControl>
									<Input {...field} disabled={isLoading} />
								</FormControl>

								{/* </div> */}
								<FormDescription>
									{t('smtpHost.description')}
								</FormDescription>
							</FormItem>
						)}
					/>

					<Separator />

					{/* Port */}
					<FormField
						control={form.control}
						name='port'
						render={({ field }) => (
							<FormItem className='px-5'>
								<FormLabel>{t('smtpPort.heading')}</FormLabel>
								<FormControl>
									<Input
										{...field}
										type='number'
										disabled={isLoading}
									/>
								</FormControl>
								<FormDescription>
									{t('smtpPort.description')}
								</FormDescription>
							</FormItem>
						)}
					/>

					<Separator />

					{/* Secure */}
					<FormField
						control={form.control}
						name='secure'
						render={({ field }) => (
							<FormItem className='flex flex-row items-center justify-between rounded-lg px-5'>
								<div className='space-y-0.5'>
									<FormLabel>
										{t('security.heading')}
									</FormLabel>
									<FormDescription>
										{t('security.description')}
									</FormDescription>
								</div>
								<FormControl>
									<Switch
										checked={field.value}
										onCheckedChange={field.onChange}
										disabled={isLoading}
									/>
								</FormControl>
							</FormItem>
						)}
					/>

					<Separator />

					{/* Username */}
					<FormField
						control={form.control}
						name='username'
						render={({ field }) => (
							<FormItem className='px-5'>
								<FormLabel>
									{t('smtpUsername.heading')}
								</FormLabel>
								<FormControl>
									<Input {...field} disabled={isLoading} />
								</FormControl>
								<FormDescription>
									{t('smtpUsername.description')}
								</FormDescription>
							</FormItem>
						)}
					/>

					<Separator />

					{/* Password */}
					<FormField
						control={form.control}
						name='password'
						render={({ field }) => (
							<FormItem className='px-5'>
								<FormLabel>
									{t('smtpPassword.heading')}
								</FormLabel>
								<FormControl>
									<Input
										{...field}
										type='password'
										placeholder='********'
										disabled={isLoading}
									/>
								</FormControl>
								<FormDescription>
									{t('smtpPassword.description')}
								</FormDescription>
							</FormItem>
						)}
					/>

					<Separator />

					{/* From Email */}
					<FormField
						control={form.control}
						name='fromEmail'
						render={({ field }) => (
							<FormItem className='px-5'>
								<FormLabel>
									{t('smtpSenderEmail.heading')}
								</FormLabel>
								<FormControl>
									<Input {...field} disabled={isLoading} />
								</FormControl>
								<FormDescription>
									{t('smtpSenderEmail.description')}
								</FormDescription>
							</FormItem>
						)}
					/>

					<Separator />

					{/* From Name */}
					<FormField
						control={form.control}
						name='fromName'
						render={({ field }) => (
							<FormItem className='px-5'>
								<FormLabel>{t('smtpName.heading')}</FormLabel>
								<FormControl>
									<Input
										{...field}
										value={field.value ?? ''}
										disabled={isLoading}
									/>
								</FormControl>
								<FormDescription>
									{t('smtpName.description')}
								</FormDescription>
							</FormItem>
						)}
					/>

					<Separator />

					{/* Actions */}
					<div className='flex justify-end gap-4 p-5'>
						<Button
							type='button'
							variant='outline'
							onClick={handleTestConnection}
							disabled={
								!form.formState.isValid ||
								isLoading ||
								isTestingEmail
							}
						>
							{isTestingEmail ? (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							) : (
								t('testButton')
							)}
						</Button>

						<Button
							type='submit'
							disabled={!form.formState.isValid || isLoading}
						>
							{isLoading ? (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							) : (
								t('submitButton')
							)}
						</Button>
					</div>
				</form>
			</Form>
		</FormWrapper>
	)
}
