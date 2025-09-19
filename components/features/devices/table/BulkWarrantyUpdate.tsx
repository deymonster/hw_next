// ... existing code ...
import { WARRANTY_PERIODS } from '@/services/device/device.interfaces'

export function BulkWarrantyUpdate({
	selectedDeviceIds,
	onUpdate,
	onClose
}: BulkWarrantyUpdateProps) {
	const [purchaseDate, setPurchaseDate] = useState<Date | undefined>()
	const [warrantyPeriod, setWarrantyPeriod] = useState<number | undefined>()
	const [endDate, setEndDate] = useState<Date | null>(null)
	// ... existing code ...

	// Вычисляем дату окончания гарантии при изменении полей
	useEffect(() => {
		if (purchaseDate && warrantyPeriod) {
			const end = new Date(purchaseDate)
			end.setMonth(end.getMonth() + warrantyPeriod)
			setEndDate(end)
		} else {
			setEndDate(null)
		}
	}, [purchaseDate, warrantyPeriod])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!purchaseDate || !warrantyPeriod) return

		setIsLoading(true)
		try {
			// Обновляем каждое устройство
			for (const deviceId of selectedDeviceIds) {
				await updateDeviceWarrantyInfo(
					deviceId,
					purchaseDate,
					warrantyPeriod,
					user.id
				)
			}

			toast.success(
				`Гарантия обновлена для ${selectedDeviceIds.length} устройств`
			)
			onUpdate()
			onClose()
		} catch (error) {
			toast.error('Ошибка при обновлении гарантии')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className='space-y-4'>
			<div className='space-y-2'>
				<Label htmlFor='purchaseDate'>Дата приобретения</Label>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant='outline'
							className={cn(
								'w-full justify-start text-left font-normal',
								!purchaseDate && 'text-muted-foreground'
							)}
						>
							<CalendarIcon className='mr-2 h-4 w-4' />
							{purchaseDate
								? format(purchaseDate, 'PPP', { locale: ru })
								: 'Выберите дату'}
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-auto p-0'>
						<Calendar
							mode='single'
							selected={purchaseDate}
							onSelect={setPurchaseDate}
							initialFocus
						/>
					</PopoverContent>
				</Popover>
			</div>

			<div className='space-y-2'>
				<Label htmlFor='warrantyPeriod'>Срок гарантии</Label>
				<Select
					value={warrantyPeriod?.toString()}
					onValueChange={value => setWarrantyPeriod(Number(value))}
				>
					<SelectTrigger>
						<SelectValue placeholder='Выберите срок гарантии' />
					</SelectTrigger>
					<SelectContent>
						{WARRANTY_PERIODS.map(period => (
							<SelectItem
								key={period.value}
								value={period.value.toString()}
							>
								{period.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{endDate && (
				<div className='rounded-md bg-muted p-3'>
					<p className='text-sm text-muted-foreground'>
						Дата окончания гарантии:{' '}
						<span className='font-medium'>
							{format(endDate, 'PPP', { locale: ru })}
						</span>
					</p>
				</div>
			)}

			<div className='flex justify-end space-x-2'>
				<Button type='button' variant='outline' onClick={onClose}>
					Отмена
				</Button>
				<Button
					type='submit'
					disabled={isLoading || !purchaseDate || !warrantyPeriod}
				>
					{isLoading ? 'Обновление...' : 'Обновить все'}
				</Button>
			</div>
		</form>
	)
}
// ... existing code ...
