import type { LucideIcon } from 'lucide-react'
import { PropsWithChildren, type ReactNode } from 'react'
import type { IconType } from 'react-icons'

import { Card } from '../card'

import { cn } from '@/utils/tw-merge'

interface CardContainerProps {
	heading: string
	description?: string
	Icon?: IconType | LucideIcon
	isRightContentFull?: boolean
	rightContent?: ReactNode
}

export function CardContainer({
	heading,
	description,
	Icon,
	rightContent,
	isRightContentFull,
	children
}: PropsWithChildren<CardContainerProps>) {
	return (
		<Card className='p-4'>
			<div className='flex items-center justify-between'>
				<div className='flex flex-row items-center gap-x-4'>
					{Icon && (
						<div className='bg-forenground rounded-full p-2.5'>
							<Icon className='size-7 text-secondary' />
						</div>
					)}
					<div className='space-y-1'>
						<h2 className='font-semibold tracking-wide'>
							{heading}
						</h2>
						{description && (
							<p className='max-width-4xl text-sm text-muted-foreground'>
								{description}
							</p>
						)}
					</div>
				</div>
				{rightContent && (
					<div className={cn(isRightContentFull && 'ml-6 w-full')}>
						{rightContent}
					</div>
				)}
			</div>
			{children && <div className='mt-4'>{children}</div>}
		</Card>
	)
}
