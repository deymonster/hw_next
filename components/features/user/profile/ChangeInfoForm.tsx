'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
	changeInfoSchema,
	type TypeChangeInfoSchema
} from '@/schemas/user/change-info.schema'

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

export function ChangeInfoForm() {
	const t = useTranslations('dashboard.settings.profile.info')
	const { user, loading, updateName } = useUser()
	const [isPending, startTransition] = useTransition()

	const form = useForm<TypeChangeInfoSchema>({
		resolver: zodResolver(changeInfoSchema),
		values: {
			username: user?.name ?? ''
		}
	})

	const { isValid, isDirty } = form.formState

	async function onSubmit(values: TypeChangeInfoSchema) {
		startTransition(async () => {
			await updateName(values.username, {
				onSuccess: () => toast.success(t('succesMessage')),
				onError: () => toast.error(t('errorMessage'))
			})
		})
	}

	return loading ? (
		<ChangeInfoFormSkeleton />
	) : (
		<FormWrapper heading={t('heading')}>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className='grid gap-y-3'
				>
					<FormField
						control={form.control}
						name='username'
						render={({ field }) => (
							<FormItem className='px-5'>
								<FormLabel>{t('usernamelabel')}</FormLabel>
								<FormControl>
									<Input
										placeholder={t('usernamePlaceholder')}
										disabled={isPending}
										{...field}
									/>
								</FormControl>
								<FormDescription>
									{t('usernameDescription')}
								</FormDescription>
							</FormItem>
						)}
					/>
					<Separator />

					<div className='flex justify-end p-5'>
						<Button disabled={!isValid || !isDirty || isPending}>
							{isPending ? (
								<>
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								</>
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

export function ChangeInfoFormSkeleton() {
	return <Skeleton className='h-96 w-full' />
}
