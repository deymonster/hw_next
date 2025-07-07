'use client'

import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { DepartmentDetail } from '../detail/DepartmentsDetail'
import { createDepartmentColumns } from './DepartmentsColumns'

import { AddDepartment } from '@/components/features/departments/add/AddDepartment'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/elements/DataTable'
import { Heading } from '@/components/ui/elements/Heading'
import { DepartmentWithCounts, useDepartment } from '@/hooks/useDepartment'

export function DepartmentsTable() {
	const t = useTranslations('dashboard.departments')
	const { departments, isLoading, error, refetch } = useDepartment()
	const [selectedDepartmentId, setSelectedDepartmentId] = useState<
		string | null
	>(null)
	const columns = useMemo(
		() => createDepartmentColumns((key: string) => t(key)),
		[t]
	)

	const selectedDepartment = useMemo(() => {
		if (!selectedDepartmentId || !departments) return null
		return departments.find(dep => dep.id === selectedDepartmentId) || null
	}, [selectedDepartmentId, departments])

	// Обработка состояния загрузки
	if (isLoading) {
		return (
			<div className='flex items-center justify-center p-4'>
				Загрузка отделов...
			</div>
		)
	}

	const handleRowClick = (department: DepartmentWithCounts) => {
		setSelectedDepartmentId(department.id)
	}

	// Обработка ошибки
	if (error) {
		return (
			<div className='flex flex-col items-center justify-center p-4 text-red-500'>
				<p>Ошибка загрузки отделов</p>
				<Button onClick={() => refetch()} className='mt-2'>
					Повторить
				</Button>
			</div>
		)
	}

	return (
		<div className='lg:px-10'>
			<div className='block items-center justify-center justify-between space-y-3 lg:flex lg:space-y-0'>
				<Heading
					title={t('header.heading')}
					description={t('header.description')}
					size='lg'
				/>
				{!selectedDepartment && <AddDepartment />}
			</div>
			{selectedDepartment ? (
				<>
					<div className='flex items-center text-sm text-muted-foreground'>
						<Button
							variant='ghost'
							size='icon'
							onClick={() => setSelectedDepartmentId(null)}
						>
							<ArrowLeft className='mr-1 h-4 w-4' />
						</Button>
						Назад
					</div>
					<DepartmentDetail
						department={selectedDepartment}
						onBack={() => setSelectedDepartmentId(null)}
					/>
				</>
			) : (
				<>
					<div className='mt-5'>
						<DataTable
							columns={columns}
							data={departments}
							onRowClick={handleRowClick}
							pagination={{
								enabled: true,
								pageSize: 10,
								showPageSize: true,
								showPageNumber: true
							}}
							filtering={{
								enabled: true,
								column: 'name',
								placeholder: 'Поиск по названию...'
							}}
						/>
					</div>
				</>
			)}
		</div>
	)
}
