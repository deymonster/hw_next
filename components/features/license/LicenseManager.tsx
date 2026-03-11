'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
	activateSchema,
	type TypeActivateSchema
} from '@/schemas/license/activate.schema'

import {
	activateProduct,
	getLicenseStatus,
	type LicenseStatus
} from '@/app/actions/licd.actions'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

interface LicenseManagerProps {
	initialStatus: LicenseStatus | null
}

export function LicenseManager({ initialStatus }: LicenseManagerProps) {
	const router = useRouter()
	const [status, setStatus] = useState<LicenseStatus | null>(initialStatus)
	const [isLoading, setIsLoading] = useState(false)

	const form = useForm<TypeActivateSchema>({
		resolver: zodResolver(activateSchema),
		defaultValues: {
			inn: ''
		}
	})

	const onSubmit = async (data: TypeActivateSchema) => {
		try {
			setIsLoading(true)
			const res = await activateProduct(data.inn)

			if (res.success) {
				toast.success(res.message || 'Лицензия успешно активирована')
				// Обновляем страницу для получения нового статуса
				const statusResult = await getLicenseStatus()
				if (statusResult.success) {
					setStatus(statusResult.data)
					router.refresh()
				}
			} else {
				toast.error(res.error || 'Ошибка активации')
			}
		} catch (error) {
			console.error('Activation error:', error)
			toast.error('Произошла неизвестная ошибка')
		} finally {
			setIsLoading(false)
		}
	}

	const isActivated = status?.status === 'active'

	return (
		<div className='grid gap-6 md:grid-cols-2'>
			{/* Status Card */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<Shield className='size-5' />
						Статус лицензии
					</CardTitle>
					<CardDescription>
						Информация о текущей лицензии и ограничениях
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					{status ? (
						<div className='space-y-4'>
							<div className='flex items-center justify-between rounded-lg border p-3 shadow-sm'>
								<div className='flex items-center gap-2'>
									{status.status === 'active' ? (
										<ShieldCheck className='size-5 text-green-500' />
									) : (
										<ShieldAlert className='size-5 text-red-500' />
									)}
									<span className='font-medium'>
										Состояние
									</span>
								</div>
								<span
									className={`font-bold ${
										status.status === 'active'
											? 'text-green-600'
											: 'text-red-600'
									}`}
								>
									{status.status === 'active'
										? 'АКТИВНА'
										: 'НЕ АКТИВНА'}
								</span>
							</div>

							<div className='grid grid-cols-2 gap-4 text-sm'>
								<div className='space-y-1'>
									<span className='text-muted-foreground'>
										Организация
									</span>
									<p className='font-medium'>
										{status.org_name || 'Не указана'}
									</p>
								</div>
								<div className='space-y-1'>
									<span className='text-muted-foreground'>
										ИНН
									</span>
									<p className='font-medium'>
										{status.inn || 'Не указан'}
									</p>
								</div>
								<div className='space-y-1'>
									<span className='text-muted-foreground'>
										Дата активации
									</span>
									<p className='font-medium'>
										{status.activation_date
											? new Date(
													status.activation_date
												).toLocaleDateString('ru-RU')
											: '-'}
									</p>
								</div>
								<div className='space-y-1'>
									<span className='text-muted-foreground'>
										Истекает
									</span>
									<p className='font-medium'>
										{status.expires_at
											? new Date(
													status.expires_at
												).toLocaleDateString('ru-RU')
											: 'Бессрочно'}
									</p>
								</div>
							</div>

							<Separator />

							<div className='space-y-2'>
								<div className='flex justify-between text-sm'>
									<span className='text-muted-foreground'>
										Использовано слотов
									</span>
									<span className='font-medium'>
										{status.used_slots} / {status.max_slots}
									</span>
								</div>
								<div className='h-2 w-full overflow-hidden rounded-full bg-secondary'>
									<div
										className='h-full bg-primary transition-all duration-500'
										style={{
											width: `${Math.min(
												(status.used_slots /
													status.max_slots) *
													100,
												100
											)}%`
										}}
									/>
								</div>
								<p className='text-xs text-muted-foreground'>
									Доступно для подключения:{' '}
									{status.remaining_slots} устройств
								</p>
							</div>
						</div>
					) : (
						<div className='flex flex-col items-center justify-center py-6 text-muted-foreground'>
							<ShieldAlert className='mb-2 size-8 opacity-50' />
							<p>Нет данных о лицензии</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Activation Form */}
			{!isActivated && (
				<Card>
					<CardHeader>
						<CardTitle>Активация продукта</CardTitle>
						<CardDescription>
							Введите ИНН организации для активации
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className='space-y-4'
							>
								<FormField
									control={form.control}
									name='inn'
									render={({ field }) => (
										<FormItem>
											<FormLabel>ИНН</FormLabel>
											<FormControl>
												<Input
													placeholder='Введите ИНН...'
													disabled={isLoading}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button
									type='submit'
									className='w-full'
									disabled={isLoading}
								>
									{isLoading
										? 'Активация...'
										: 'Активировать'}
								</Button>
							</form>
						</Form>
					</CardContent>
					<CardFooter className='flex flex-col items-start gap-2 text-xs text-muted-foreground'>
						<p>
							Для активации требуется подключение к интернету.
							Сервер лицензирования проверит валидность ИНН и
							оборудования.
						</p>
					</CardFooter>
				</Card>
			)}
		</div>
	)
}
