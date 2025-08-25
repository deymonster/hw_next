'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Device } from '@prisma/client'
import { AlertCircle, CheckCircle, Loader2, Shield } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { confirmHardwareChange } from '@/app/actions/device'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

// Схема валидации для формы
const confirmSchema = z.object({
	password: z.string().min(1, 'passwordRequired')
})

type ConfirmForm = z.infer<typeof confirmSchema>

interface HardwareChangeConfirmModalProps {
	isOpen: boolean
	onClose: () => void
	device: Device
	onSuccess?: () => void
}

export function HardwareChangeConfirmModal({
	isOpen,
	onClose,
	device,
	onSuccess
}: HardwareChangeConfirmModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const t = useTranslations('dashboard.devices.hardwareChange.modal')

	const form = useForm<ConfirmForm>({
		resolver: zodResolver(confirmSchema),
		defaultValues: {
			password: ''
		}
	})

	const onSubmit = async (data: ConfirmForm) => {
		setIsSubmitting(true)
		try {
			const result = await confirmHardwareChange(device.id, data.password)

			if (result.success) {
				toast.success(t('successMessage'))
				onSuccess?.()
				onClose()
				form.reset()
			} else {
				// Отображаем конкретную ошибку от сервера
				const errorMessage = result.error || t('errorMessage')
				toast.error(errorMessage)

				// Если ошибка связана с паролем, очищаем поле пароля
				if (result.error?.includes('Неверный пароль')) {
					form.setValue('password', '')
					form.setFocus('password')
				}
			}
		} catch (error) {
			console.error('Error confirming hardware change:', error)
			toast.error(t('unexpectedError'))
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleClose = () => {
		if (!isSubmitting) {
			form.reset()
			onClose()
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Shield className='h-5 w-5 text-amber-500' />
						{t('title')}
					</DialogTitle>
					<DialogDescription>{t('description')}</DialogDescription>
				</DialogHeader>

				{/* Информация об устройстве */}
				<div className='rounded-lg bg-muted/50 p-4'>
					<div className='space-y-2'>
						<div className='flex justify-between'>
							<span className='text-sm font-medium'>
								{t('deviceLabel')}
							</span>
							<span className='text-sm'>{device.name}</span>
						</div>
						<div className='flex justify-between'>
							<span className='text-sm font-medium'>
								{t('ipAddressLabel')}
							</span>
							<span className='text-sm'>{device.ipAddress}</span>
						</div>
						<div className='mt-3 rounded border-l-4 border-amber-500 bg-amber-50 p-3 dark:bg-amber-950/20'>
							<div className='flex items-start gap-2'>
								<AlertCircle className='mt-0.5 h-4 w-4 text-amber-600' />
								<div className='text-sm text-amber-800 dark:text-amber-200'>
									<p className='font-medium'>
										{t('changesDetected')}
									</p>
									<p>{t('changesDescription')}</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className='space-y-4'
					>
						<FormField
							control={form.control}
							name='password'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('passwordLabel')}</FormLabel>
									<FormControl>
										<Input
											type='password'
											placeholder={t(
												'passwordPlaceholder'
											)}
											disabled={isSubmitting}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button
								type='button'
								variant='outline'
								onClick={handleClose}
								disabled={isSubmitting}
							>
								{t('cancelButton')}
							</Button>
							<Button
								type='submit'
								disabled={isSubmitting}
								variant='default'
							>
								{isSubmitting ? (
									<>
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
										{t('confirmingButton')}
									</>
								) : (
									<>
										<CheckCircle className='mr-2 h-4 w-4' />
										{t('confirmButton')}
									</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
