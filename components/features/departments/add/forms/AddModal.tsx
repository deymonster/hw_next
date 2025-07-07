'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
	AddDepartmentForm,
	addDepartmentSchema
} from '@/schemas/department/addDepartment.schema'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useDepartment } from '@/hooks/useDepartment'

interface AddDepartmentModalProps {
	isOpen: boolean
	onClose: () => void
}

export function AddDepartmentModal({
	isOpen,
	onClose
}: AddDepartmentModalProps) {
	const t = useTranslations('dashboard.departments.modal.add')
	const queryClient = useQueryClient()
	const { createDepartment } = useDepartment()
	const [isSubmitting, setIsSubmitting] = useState(false)

	const form = useForm<AddDepartmentForm>({
		resolver: zodResolver(addDepartmentSchema),
		defaultValues: {
			name: '',
			description: ''
		}
	})
	const { isValid } = form.formState

	const handleModalClose = useCallback(() => {
		form.reset()
		onClose()
	}, [form, onClose])

	const onSubmit = async (data: AddDepartmentForm) => {
		try {
			setIsSubmitting(true)
			await createDepartment(data)
			queryClient.invalidateQueries({ queryKey: ['departments'] })
			toast.success(t('success'))
			handleModalClose()
		} catch (error) {
			console.error(error)
			toast.error(t('error'))
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog
			open={isOpen}
			onOpenChange={open => {
				if (!open) handleModalClose()
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('heading')}</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className='space-y-6'
					>
						<FormField
							control={form.control}
							name='name'
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('nameLabel')}</FormLabel>
									<FormControl>
										<Input
											{...field}
											disabled={isSubmitting}
											placeholder={t('namePlaceholder')}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name='description'
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t('descriptionLabel')}
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											disabled={isSubmitting}
											placeholder={t(
												'descriptionPlaceholder'
											)}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button
								type='submit'
								disabled={!isValid || isSubmitting}
							>
								{isSubmitting ? (
									<>
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
										{t('submitting')}
									</>
								) : (
									t('submitButton')
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
