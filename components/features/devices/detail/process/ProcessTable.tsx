import { ArrowUpDown } from 'lucide-react'
import React from 'react'

import { ProcessInfo } from '@/services/prometheus/prometheus.interfaces'

type SortField = 'name' | 'instances' | 'cpu' | 'memory'
type SortDirection = 'asc' | 'desc'

interface ProcessTableProps {
	processes: ProcessInfo[]
	sortField: SortField
	sortDirection: SortDirection
	handleSort: (field: SortField) => void
	showAllProcesses: boolean
}

// Количество процессов для отображения, если showAllProcesses = false
const TOP_PROCESSES_COUNT = 10

export function ProcessTable({
	processes,
	sortField,
	sortDirection,
	handleSort,
	showAllProcesses
}: ProcessTableProps) {
	// Sort processes based on current sort field and direction
	const sortedProcesses = React.useMemo(() => {
		// Добавляем проверку на undefined
		if (!processes) return []

		return [...processes].sort((a, b) => {
			let comparison = 0

			switch (sortField) {
				case 'name':
					comparison = a.name.localeCompare(b.name)
					break
				case 'instances':
					comparison = a.instances - b.instances
					break
				case 'cpu':
					comparison = a.metrics.cpu - b.metrics.cpu
					break
				case 'memory':
					comparison =
						a.metrics.memory.workingSet -
						b.metrics.memory.workingSet
					break
			}

			return sortDirection === 'asc' ? comparison : -comparison
		})
	}, [processes, sortField, sortDirection])

	// Применяем фильтрацию в зависимости от showAllProcesses
	const displayedProcesses = React.useMemo(() => {
		// Проверяем, что sortedProcesses определен и является массивом
		if (!sortedProcesses || !Array.isArray(sortedProcesses)) {
			return []
		}

		if (showAllProcesses) {
			return sortedProcesses
		} else {
			return sortedProcesses.slice(0, TOP_PROCESSES_COUNT)
		}
	}, [sortedProcesses, showAllProcesses])

	// Render sortable column header
	const renderSortableHeader = (label: string, field: SortField) => (
		<div
			className='flex cursor-pointer select-none items-center'
			onClick={() => handleSort(field)}
		>
			<span>{label}</span>
			<ArrowUpDown
				className={`ml-1 h-4 w-4 ${sortField === field ? 'opacity-100' : 'opacity-30'}`}
				style={{
					transform:
						sortField === field && sortDirection === 'asc'
							? 'rotate(180deg)'
							: 'none',
					transition: 'transform 0.2s'
				}}
			/>
		</div>
	)

	// Normalize CPU value for display (cap at 100% for progress bar)
	const normalizeCpuValue = (value: number): number => {
		// Cap at 100%
		return Math.min(value, 100)
	}

	return (
		<div className='overflow-x-auto'>
			<table className='w-full'>
				<thead className='border-y border-border bg-muted/30'>
					<tr>
						<th className='p-3 text-left text-sm font-medium text-muted-foreground'>
							{renderSortableHeader('Process Name', 'name')}
						</th>
						<th className='p-3 text-left text-sm font-medium text-muted-foreground'>
							{renderSortableHeader('Экземпляры', 'instances')}
						</th>
						<th className='p-3 text-right text-sm font-medium text-muted-foreground'>
							{renderSortableHeader('CPU', 'cpu')}
						</th>
						<th className='p-3 text-right text-sm font-medium text-muted-foreground'>
							{renderSortableHeader('Memory', 'memory')}
						</th>
					</tr>
				</thead>

				<tbody>
					{displayedProcesses.map((process, index) => (
						<tr
							key={index}
							className='border-b border-border transition-colors hover:bg-muted/20'
						>
							<td
								className='max-w-[200px] truncate p-3 text-sm'
								title={process.name}
							>
								{process.name}
							</td>
							<td className='p-3 text-sm text-muted-foreground'>
								{process.instances}
							</td>
							<td className='p-3 text-right text-sm'>
								<div className='flex items-center justify-end gap-2'>
									<div className='h-1.5 w-16 overflow-hidden rounded-full bg-muted'>
										<div
											className={`h-full rounded-full ${
												process.metrics?.cpu > 50
													? 'bg-orange-500'
													: process.metrics?.cpu > 20
														? 'bg-blue-500'
														: 'bg-green-500'
											}`}
											style={{
												width: `${normalizeCpuValue(process.metrics.cpu || 0)}%`
											}}
										/>
									</div>
									<span
										className={` ${
											process.metrics?.cpu > 50
												? 'text-orange-500'
												: process.metrics?.cpu > 20
													? 'text-blue-500'
													: 'text-green-500'
										} `}
									>
										{(process.metrics?.cpu || 0).toFixed(1)}
										%
									</span>
								</div>
							</td>
							<td className='p-3 text-right text-sm'>
								{process.metrics.memory?.workingSet
									? `${process.metrics.memory.workingSet.toFixed(2)} MB`
									: 'N/A'}
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{!showAllProcesses && processes.length > TOP_PROCESSES_COUNT && (
				<div className='p-2 text-center text-xs text-muted-foreground'>
					Показаны топ-{TOP_PROCESSES_COUNT} процессов. Включите
					&quot;Show all processes&quot; для просмотра всех{' '}
					{processes.length} процессов.
				</div>
			)}
		</div>
	)
}
