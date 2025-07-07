import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
	changePasswordSchema,
	type TypeChangePasswordSchema
} from '@/schemas/user/change-password.schema'

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

export function ChangePasswordForm() {
	const t = useTranslations('dashboard.settings.account.password')
	const { loading: isLoadingProfile, updatePassword } = useUser()
	const [isPending, startTransition] = useTransition()

	const form = useForm<TypeChangePasswordSchema>({
		resolver: zodResolver(changePasswordSchema),
		values: {
			oldPassword: '',
			newPassword: ''
		}
	})

	const { isValid } = form.formState

	async function onSubmit(values: TypeChangePasswordSchema) {
		if (!isValid) return
		startTransition(async () => {
			await updatePassword(values.oldPassword, values.newPassword, {
				onSuccess: () => {
					toast.success(t('succesMessage'))
					form.reset()
				},
				onError: () => toast.error(t('errorMessage'))
			})
		})
	}
	if (isLoadingProfile) return <ChangePasswordFormSkeleton />

	return (
		<FormWrapper heading={t('heading')}>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className='grid gap-y-3'
				>
					<FormField
						control={form.control}
						name='oldPassword'
						render={({ field }) => (
							<FormItem className='px-5'>
								<FormLabel>{t('oldPasswordLabel')}</FormLabel>
								<FormControl>
									<Input
										placeholder='********'
										{...field}
										type='password'
										disabled={isPending}
									/>
								</FormControl>
								<FormDescription>
									{t('oldPasswordDescription')}
								</FormDescription>
							</FormItem>
						)}
					/>

					<Separator />

					<FormField
						control={form.control}
						name='newPassword'
						render={({ field }) => (
							<FormItem className='px-5'>
								<FormLabel>{t('newPasswordLabel')}</FormLabel>
								<FormControl>
									<Input
										placeholder='********'
										{...field}
										type='password'
										disabled={isPending}
									/>
								</FormControl>
								<FormDescription>
									{t('newPasswordDescription')}
								</FormDescription>
							</FormItem>
						)}
					/>
					<Separator />

					<div className='flex justify-end p-5'>
						<Button
							type='submit'
							disabled={!isValid || isPending || isLoadingProfile}
						>
							{isPending ? (
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

export function ChangePasswordFormSkeleton() {
	return <Skeleton className='h-96 w-full' />
}
