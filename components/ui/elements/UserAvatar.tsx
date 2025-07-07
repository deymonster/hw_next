import { cva, type VariantProps } from 'class-variance-authority'

import { Avatar, AvatarFallback, AvatarImage } from '../avatar'

import { getMediaSource } from '@/utils/get-media-source'
import { cn } from '@/utils/tw-merge'

const avatarSizes = cva('', {
	variants: {
		size: {
			sm: 'size-7',
			default: 'size-9',
			lg: 'size-14',
			xl: 'size-32'
		},
		defaultVariants: {
			size: 'default'
		}
	}
})

interface UserAvatarProps extends VariantProps<typeof avatarSizes> {
	profile: {
		name?: string | null
		image?: string | File | null
		picture?: string | null
	}
	isLive?: boolean
}

export function UserAvatar({ size, profile, isLive }: UserAvatarProps) {
	const imageUrl = profile.image
		? profile.image instanceof File
			? URL.createObjectURL(profile.image)
			: typeof profile.image === 'string'
				? profile.image.startsWith('http')
					? profile.image
					: getMediaSource(profile.image)
				: undefined
		: undefined

	return (
		<div className='relative'>
			<Avatar
				className={cn(
					avatarSizes({ size }),
					isLive && 'ring-2 ring-rose-500'
				)}
			>
				<AvatarImage
					src={imageUrl || ''}
					// src="https://github.com/shadcn.png"
					alt={profile.name || 'User avatar'}
					className='object-cover'
				/>
				<AvatarFallback className={cn(size === 'xl' && 'text-4xl')}>
					{profile.name?.[0]?.toUpperCase() || '?'}
				</AvatarFallback>
			</Avatar>
		</div>
	)
}
