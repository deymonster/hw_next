import React from 'react'

import { Skeleton } from '@/components/ui/skeleton'

export function ProcessSkeleton() {
	return (
		<div className='space-y-3 p-4'>
			{[...Array(5)].map((_, i) => (
				<div key={i} className='flex items-center justify-between'>
					<Skeleton className='h-5 w-1/3' />
					<Skeleton className='h-5 w-16' />
					<Skeleton className='h-5 w-20' />
					<Skeleton className='h-5 w-24' />
				</div>
			))}
		</div>
	)
}
