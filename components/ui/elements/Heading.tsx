'use client'

import { cva, VariantProps } from 'class-variance-authority'

import { cn } from '@/utils/tw-merge'

const headingSize = cva('', {
	variants: {
		size: {
			sm: 'text-lg',
			default: 'text-2xl',
			lg: 'text-4xl',
			xl: 'text-5xl'
		}
	},
	defaultVariants: {
		size: 'default'
	}
})

interface HeadingProps extends VariantProps<typeof headingSize> {
	title: string
	description?: string
	className?: string
}

export function Heading({ size, title, description, className }: HeadingProps) {
	return (
		<div className={cn('space-y-2', className)}>
			<h1
				className={cn(
					'font-semibold text-foreground',
					headingSize({ size })
				)}
			>
				{title}
			</h1>
			{description && (
				<p className='text-muted-foreground'>{description}</p>
			)}
		</div>
	)
}
