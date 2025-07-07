'use client'

import { ArrowLeft } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { AddInventory } from '../add/AddInventory'
import { InventoryDetail } from '../detail/InventoryDetail'
import { createInventoryColumns } from './InventoryColumns'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/elements/DataTable'
import { DatePicker } from '@/components/ui/elements/DatePicker'
import { Heading } from '@/components/ui/elements/Heading'
import { InventoryWithRelations, useInventory } from '@/hooks/useInventory'

interface DateRange {
	from: Date | undefined
	to: Date | undefined
}

export function InventoryTable() {
	const t = useTranslations('dashboard.inventory')

	const [dateRange, setDateRange] = useState<DateRange>({
		from: undefined,
		to: undefined
	})
	const { data: session } = useSession()
	const [selectedInventory, setSelectedInventory] =
		useState<InventoryWithRelations | null>(null)
	const userId = session?.user?.id

	const { inventories, isLoadingInventories, inventoriesError, refetch } =
		useInventory(userId)

	const formattedInventories = useMemo(() => {
		let filtered = inventories.map(inventory => ({
			...inventory,
			items: inventory.items || [],
			departments: inventory.departments || []
		}))

		// Фильтрация по диапазону дат
		if (dateRange.from || dateRange.to) {
			filtered = filtered.filter(inventory => {
				const createdAt = new Date(inventory.createdAt)
				const isAfterFrom =
					!dateRange.from || createdAt >= dateRange.from
				const isBeforeTo = !dateRange.to || createdAt <= dateRange.to
				return isAfterFrom && isBeforeTo
			})
		}

		return filtered
	}, [inventories, dateRange])

	const columns = useMemo(
		() => createInventoryColumns((key: string) => t(key)),
		[t]
	)

	const DateRangeFilter = () => (
		<div className='mb-4 flex items-center gap-2'>
			<DatePicker
				value={dateRange.from}
				onChange={date =>
					setDateRange(prev => ({ ...prev, from: date }))
				}
				placeholder={t('table.dateFrom')}
				className='w-[200px]'
			/>
			<span className='text-muted-foreground'>—</span>
			<DatePicker
				value={dateRange.to}
				onChange={date => setDateRange(prev => ({ ...prev, to: date }))}
				placeholder={t('table.dateTo')}
				className='w-[200px]'
			/>
		</div>
	)

	const handleRowClick = (inventory: InventoryWithRelations) => {
		setSelectedInventory(inventory)
	}

	if (inventoriesError) {
		return (
			<div className='flex flex-col items-center justify-center p-4 text-red-500'>
				<p>{t('table.error')}</p>
				<Button onClick={() => refetch()} className='mt-2'>
					{t('table.refetch')}
				</Button>
			</div>
		)
	}

	if (isLoadingInventories) {
		return (
			<div className='flex items-center justify-center p-4'>
				{t('table.loading')}
			</div>
		)
	}

	if (inventoriesError) {
		return (
			<div className='flex flex-col items-center justify-center p-4 text-red-500'>
				<p>{t('table.error')}</p>
				<Button onClick={() => refetch()} className='mt-2'>
					{t('table.refetch')}
				</Button>
			</div>
		)
	}

	return (
		<div className='lg:px-10'>
			<div className='block items-center justify-between space-y-3 lg:flex lg:space-y-0'>
				<Heading
					title={t('header.heading')}
					description={t('header.description')}
					size='lg'
				/>
				{!selectedInventory && <AddInventory />}
			</div>

			{selectedInventory ? (
				<>
					<div className='flex items-center text-sm text-muted-foreground'>
						<Button
							variant='ghost'
							size='icon'
							onClick={() => setSelectedInventory(null)}
						>
							<ArrowLeft className='mr-1 h-4 w-4' />
						</Button>
						Назад
					</div>
					<InventoryDetail
						inventory={selectedInventory}
						onBack={() => setSelectedInventory(null)}
					/>
				</>
			) : (
				<>
					<div className='mt-5'>
						<DateRangeFilter />
						<DataTable
							columns={columns}
							data={formattedInventories}
							pagination={{
								enabled: true,
								pageSize: 10,
								showPageSize: true,
								showPageNumber: true
							}}
							onRowClick={handleRowClick}
						/>
					</div>
				</>
			)}
		</div>
	)
}
