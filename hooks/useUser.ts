import { useSession } from 'next-auth/react'
import { useCallback } from 'react'
import { deleteUserAvatar, updateUserAvatar, updateUserName } from '@/app/actions/user'

export function useUser() {
  const { data: session, status, update: updateSession } = useSession()
  const user = session?.user
  const isAuthenticated = status === "authenticated"

  const updateAvatar = useCallback(async (
      file: File, 
      { onSuccess, onError}: {
        onSuccess?: () => void,
        onError?:(error: unknown) => void
      } = {} ) => {
    
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
        onSuccess?.()
        return updatedUser
      }
      return null
    } catch (error) {
      console.error('[UPDATE_AVATAR_ERROR]', error)
      onError?.(error) 
      return null
    }
  }, [user?.id, session?.user, updateSession])

  const deleteAvatar = useCallback(async (
    { onSuccess, onError}: {
      onSuccess?: () => void,
      onError?:(error: unknown) => void
    } = {}
  ) => {
    
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
        onSuccess?.()
        return updatedUser
      }
      return null
    } catch (error) {
      console.error('[DELETE_AVATAR_ERROR]', error)
      onError?.(error)
      return null
    }
  }, [user?.id, session?.user, updateSession])

  const updateName = useCallback(async (
    name: string,
    { onSuccess, onError}: {
      onSuccess?: () => void,
      onError?:(error: unknown) => void
    } = {}
  ) => {
    if (!user?.id) return null
    try {
      const updatedUser = await updateUserName(user.id, name)
      if (updatedUser) {
        // Update session with new name
        await updateSession({
          user: {
            ...session?.user,
            name: updatedUser.name
          }
        })
        onSuccess?.()
        return updatedUser
      }
      return null
    } catch (error) {
      console.error('[UPDATE_NAME_ERROR]', error)
      onError?.(error)
      return null
    }
  }, [user?.id, session?.user, updateSession])



  return {
    user,
    loading: status === "loading",
    isAuthenticated,
    updateAvatar,
    deleteAvatar,
    updateName
  }
}
