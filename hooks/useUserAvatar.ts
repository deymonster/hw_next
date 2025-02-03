import { useCallback } from 'react'
import { useData } from './useData'
import { updateUserAvatar, deleteUserAvatar } from '@/app/actions/user'
import { useAuth } from './useAuth'
import { User } from '@prisma/client'
import { useSession } from 'next-auth/react'

export function useUserAvatar() {
    const { user } = useAuth()
    const { mutate } = useData<User>(`user-${user?.id}`)
    const { data: session, update: updateSession } = useSession()

    const updateAvatar = useCallback(async (file: File) => {
        if (!user?.id) return

        try {
            const updatedUser = await mutate(
                async () => {
                    const result = await updateUserAvatar(user.id, file)
                    if (!result) throw new Error('Failed to update avatar')
                    console.log('Updated user in hook:', result)

                    // Обновляем сессию с новыми данными
                    await updateSession({
                        ...session,
                        user: {
                            ...session?.user,
                            image: result.image,
                            picture: result.image // Добавляем picture для NextAuth
                        }
                    })

                    return result
                },
                {
                    optimisticData: (current: User | undefined) => ({
                        ...(current as User),
                        image: URL.createObjectURL(file)
                    } as User),
                    rollbackOnError: true,
                    revalidate: true
                }
            )
            return updatedUser
        } catch (error) {
            console.error('Failed to update avatar:', error)
            throw error
        }
    }, [user, mutate, session, updateSession])

    const deleteAvatar = useCallback(async () => {
        if (!user?.id) return

        try {
            const updatedUser = await mutate(
                async () => {
                    const result = await deleteUserAvatar(user.id)
                    if (!result) throw new Error('Failed to delete avatar')

                    // Обновляем сессию при удалении аватара
                    await updateSession({
                        ...session,
                        user: {
                            ...session?.user,
                            image: null,
                            picture: null // Добавляем picture для NextAuth
                        }
                    })

                    return result
                },
                {
                    optimisticData: (current: User | undefined) => ({
                        ...(current as User),
                        image: null
                    } as User),
                    rollbackOnError: true,
                    revalidate: true
                }
            )
            return updatedUser
        } catch (error) {
            console.error('Failed to delete avatar:', error)
            throw error
        }
    }, [user, mutate, session, updateSession])

    return { updateAvatar, deleteAvatar }
}