'use client'

import { Skeleton } from "@/components/ui/skeleton"
import { type ChangeEvent, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslations } from "use-intl"
import { TypeUploadFileSchema, UploadFileSchema } from "@/schemas/upload-file.schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { getMediaSource } from "@/utils/get-media-source"
import { FormWrapper } from "@/components/ui/elements/FormWrapper"
import { Form, FormField } from "@/components/ui/form"
import { UserAvatar } from "@/components/ui/elements/UserAvatar"
import { Button } from "@/components/ui/button"
import { toast } from 'sonner'
import { useUser } from "@/hooks/useUser"

export function ChangeAvatarForm() {
    const t = useTranslations('dashboard.settings.profile.avatar')
    const { user, loading, updateAvatar, deleteAvatar } = useUser()
    const inputRef = useRef<HTMLInputElement>(null)

    const form = useForm<TypeUploadFileSchema>({
        resolver: zodResolver(UploadFileSchema),
    })

    async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]

        if (file) {
            try {
                form.setValue('file', file)
                const updatedUser = await updateAvatar(file)
                if (updatedUser) {
                    toast.success(t('successUpdateMessage'))
                }
            } catch (error) {
                toast.error(t('errorUpdateMessage'))
                form.setValue('file', user?.image ? getMediaSource(user.image) : undefined)
            }
        }
    }

    async function handleDeleteAvatar() {
        try {
            await deleteAvatar()
            toast.success(t('successDeleteMessage'))
        } catch (error) {
            toast.error(t('errorDeleteMessage'))
        }
    }
    

    if (loading) return <ChangeAvatarFormSkeleton />

    return (
        <FormWrapper heading={t('heading')}>
            <Form {...form}>
                <FormField 
                    control={form.control} 
                    name='file' 
                    render={({ field }) => (
                        <div className='px-5 pb-5'>
                            <div className='w-full items-center space-x-6 lg:flex'>
                                <UserAvatar
                                    profile={{
                                        name: user?.name!,
                                        image: getMediaSource(user?.image!)
                                    }}
                                    size='xl'
                                />
                                <div className='space-y-3'>
                                    <div className='flex items-center gap-x-3'>
                                        <input 
                                            className='hidden' 
                                            type='file'
                                            accept="image/*"
                                            ref={inputRef} 
                                            onChange={handleImageChange}
                                        />
                                        <Button 
                                            variant='secondary' 
                                            onClick={() => inputRef.current?.click()}
                                        >
                                            {t('updateButton')}
                                        </Button>
                                        {/* <Button
                                            variant='secondary'
                                            onClick={handleDeleteAvatar}
                                            disabled={!user?.image}
                                        >
                                            {t('deleteButton')}
                                        </Button> */}
                                    </div>
                                    <p className='text-sm text-muted-foreground'>{t('info')}</p>
                                </div>
                            </div>
                        </div>
                    )}
                />
            </Form>
        </FormWrapper>
    )
}

export function ChangeAvatarFormSkeleton() {
    return (
        <Skeleton className='h-52 w-full'/>
    )
}
