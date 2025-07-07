'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
	changeThemeSchema,
	type TypeChangeThemeSchema
} from '@/schemas/user/change-theme.schema'

import { ToggleCard } from '@/components/ui/elements/ToggleCard'
import { Form, FormField } from '@/components/ui/form'

export function ChangeThemeForm() {
	const t = useTranslations('dashboard.settings.appearance.theme')
	const { theme, setTheme } = useTheme()

	const form = useForm<TypeChangeThemeSchema>({
		resolver: zodResolver(changeThemeSchema),
		values: {
			theme: theme === 'dark' ? 'dark' : 'light'
		}
	})

	function onChange(value: boolean) {
		const newTheme = value ? 'dark' : 'light'

		setTheme(newTheme)
		form.setValue('theme', newTheme)
		toast.success(t('succesMessage'))
	}
	return (
		<Form {...form}>
			<FormField
				control={form.control}
				name='theme'
				render={({ field }) => (
					<ToggleCard
						heading={t('heading')}
						description={t('description')}
						value={field.value === 'dark'}
						onChange={onChange}
					/>
				)}
			/>
		</Form>
	)
}
