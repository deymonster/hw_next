import { useSession } from 'next-auth/react'
import { useCallback } from 'react'
import { deleteUserAvatar, updateUserAvatar } from '@/app/actions/user'

export function useUser() {
  const { data: session, status, update: updateSession } = useSession()
  const user = session?.user
  const isAuthenticated = status === "authenticated"

  const updateAvatar = useCallback(async (file: File) => {
    console.log('User in hook useUser', user)
    if (!user?.id) return null

    try {
      const updatedUser = await updateUserAvatar(user.id, file)
      if (updatedUser) {
        // Обновляем сессию с новым изображением
        await updateSession({
          user: {
            ...session?.user,
            image: updatedUser.image
          }
        })
        return updatedUser
      }
      return null
    } catch (error) {
      console.error('[UPDATE_AVATAR_ERROR]', error)
      return null
    }
  }, [user?.id, session?.user, updateSession])

  const deleteAvatar = useCallback(async () => {
    console.log('Deleting avatar for user:', user?.id)
    if (!user?.id) return null

    try {
      const updatedUser = await deleteUserAvatar(user.id)
      console.log('Updated user after delete:', updatedUser)
      if (updatedUser) {
        // Обновляем сессию, удаляя изображение
        await updateSession({
          user: {
            ...session?.user,
            image: null
          }
        })
        return updatedUser
      }
      return null
    } catch (error) {
      console.error('[DELETE_AVATAR_ERROR]', error)
      return null
    }
  }, [user?.id, session?.user, updateSession])

  return {
    user,
    loading: status === "loading",
    isAuthenticated,
    updateAvatar,
    deleteAvatar
  }
}
