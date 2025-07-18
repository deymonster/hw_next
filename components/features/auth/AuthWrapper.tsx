import Link from 'next/link'
import { PropsWithChildren } from 'react'

import { LogoImage } from '@/components/images/LogoImage'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'

interface AuthWrapperProps {
	heading: string
	backButtonLabel?: string
	backButtonHref?: string
}

export function AuthWrapper({
	children,
	heading,
	backButtonLabel,
	backButtonHref
}: PropsWithChildren<AuthWrapperProps>) {
	return (
		<div className='flex h-full items-center justify-center'>
			<Card className='w-[450px]'>
				<CardHeader className='flex-row items-center justify-center gap-x-4'>
					<LogoImage />
					<CardTitle>{heading}</CardTitle>
				</CardHeader>
				<CardContent>{children}</CardContent>
				<CardFooter className='-mt-2'>
					{backButtonLabel && backButtonHref && (
						<Button variant='ghost' className='w-full' asChild>
							<Link href={backButtonHref}>{backButtonLabel}</Link>
						</Button>
					)}
				</CardFooter>
			</Card>
		</div>
	)
}
