import React, { useState } from 'react'

import { ProcessError } from './ProcessError'
import { ProcessHeader } from './ProcessHeader'
import { ProcessSkeleton } from './ProcessSkeleton'
import { ProcessTable } from './ProcessTable'

import { Card, CardContent } from '@/components/ui/card'
import { ProcessListData } from '@/hooks/useProcessMetrics'

interface ProcessListProps {
	deviceId: string
	data: ProcessListData | null
	isLoading: boolean
	isConnected: boolean
	error: string | null
	lastUpdated: number | null
	onReconnect: () => void
}

type SortField = 'name' | 'instances' | 'cpu' | 'memory'
type SortDirection = 'asc' | 'desc'

export function ProcessList({
	data,
	isLoading,
	isConnected,
	error,
	lastUpdated,
	onReconnect
}: ProcessListProps) {
	const [sortField, setSortField] = useState<SortField>('cpu')
	const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
	const [showAllProcesses, setShowAllProcesses] = useState(false)

	// Handle column sorting
	const handleSort = (field: SortField) => {
		if (sortField === field) {
			// Toggle direction if same field
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
		} else {
			// Set new field and default to descending
			setSortField(field)
			setSortDirection('desc')
		}
	}

	return (
		<Card className='overflow-hidden'>
			<ProcessHeader
				isConnected={isConnected}
				isLoading={isLoading}
				lastUpdated={lastUpdated}
				totalProcesses={data?.total || 0}
				showAllProcesses={showAllProcesses}
				setShowAllProcesses={setShowAllProcesses}
				reconnect={onReconnect}
			/>

			<CardContent className='p-0'>
				{error && (
					<ProcessError error={error} reconnect={onReconnect} />
				)}

				{isLoading && !data && <ProcessSkeleton />}

				{data && data.processes ? (
					<ProcessTable
						processes={data.processes}
						sortField={sortField}
						sortDirection={sortDirection}
						handleSort={handleSort}
						showAllProcesses={showAllProcesses}
					/>
				) : (
					!isLoading &&
					!error && (
						<div className='flex items-center justify-center p-8 text-muted-foreground'>
							No processes found
						</div>
					)
				)}
			</CardContent>
		</Card>
	)
}
