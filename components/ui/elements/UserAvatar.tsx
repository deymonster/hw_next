import { cva, type VariantProps } from "class-variance-authority";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { cn } from "@/utils/tw-merge";
import { getMediaSource } from "@/utils/get-media-source";

const avatarSizes = cva('', {
    variants: {
        size: {
            sm: 'size-7',
            default: 'size-9',
            lg: 'size-14'
        },
        defaultVariants: {
            size: 'default'
        }
    }
})

interface UserAvatarProps extends VariantProps<typeof avatarSizes>{
    profile: {
        name?: string | null,
        image?: string | null
    }
    isLive?: boolean,
}

export function UserAvatar({ size, profile, isLive }: UserAvatarProps) {
    return <div className="relative">
        <Avatar className={cn(
                avatarSizes({ size }), 
                isLive && 'ring-2 ring-rose-500'
            )}
        >
            <AvatarImage src={getMediaSource(profile.image!)} className="object-cover"/>
            <AvatarFallback>
                {profile.name?.[0] || '?'}
            </AvatarFallback>
        </Avatar>
    </div>
}
