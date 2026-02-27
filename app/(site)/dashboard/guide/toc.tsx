'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/utils/tw-merge'

interface TocProps {
	items: {
		id: string
		text: string
		level: number
	}[]
}

export function Toc({ items }: TocProps) {
	const [activeId, setActiveId] = useState<string>('')

	useEffect(() => {
		const observer = new IntersectionObserver(
			entries => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id)
					}
				})
			},
			{ rootMargin: '0% 0% -80% 0%' }
		)

		items.forEach(item => {
			const element = document.getElementById(item.id)
			if (element) {
				observer.observe(element)
			}
		})

		return () => observer.disconnect()
	}, [items])

	if (!items.length) {
		return null
	}

	return (
		<div className='hidden w-64 shrink-0 lg:block'>
			<div className='sticky top-24 space-y-4'>
				<p className='text-sm font-semibold'>На этой странице</p>
				<ul className='space-y-2 text-sm'>
					{items.map(item => (
						<li
							key={item.id}
							className={cn(item.level === 2 ? 'pl-4' : '')}
						>
							<a
								href={`#${item.id}`}
								className={cn(
									'block transition-colors hover:text-foreground',
									activeId === item.id
										? 'font-medium text-primary'
										: 'text-muted-foreground'
								)}
								onClick={e => {
									e.preventDefault()
									document
										.getElementById(item.id)
										?.scrollIntoView({
											behavior: 'smooth'
										})
									setActiveId(item.id)
								}}
							>
								{item.text}
							</a>
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}
