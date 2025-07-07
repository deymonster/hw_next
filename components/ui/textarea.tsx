import { type ComponentProps, forwardRef } from 'react'

import { cn } from '@/utils/tw-merge'

const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<'textarea'>>(
	({ className, ...props }, ref) => {
		return (
			<textarea
				className={cn(
					'flex max-h-[80px] min-h-[80px] w-full rounded-md border border-border bg-input px-3 py-2 text-base text-sm ring-offset-background placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
					className
				)}
				ref={ref}
				{...props}
			/>
		)
	}
)
Textarea.displayName = 'Textarea'

export { Textarea }
