import { useSession } from 'next-auth/react'
import { useCallback } from 'react'
import { 
  deleteUserAvatar, 
  updateUserAvatar, 
  updateUserName, 
  updateUserEmail,
  initiateEmailChange,
  verifyEmailChangeCode,
  confirmEmailChange,
  updateUserPassword
} from '@/app/actions/user'

interface CallbackOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useUser() {
  const { data: session, status, update: updateSession } = useSession()
  const user = session?.user
  const isAuthenticated = status === "authenticated"

  const initiateChangeEmail = useCallback(async (
    newEmail: string,
    { onSuccess, onError }: CallbackOptions = {}
  ) => {
    if (!user?.id || !user?.email) return false;

    try {
      const success = await initiateEmailChange(user.id, user.email, newEmail);
      if (success) {
        onSuccess?.();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[INITIATE_EMAIL_CHANGE_ERROR]', error);
      onError?.(error);
      return false;
    }
  }, [user?.id, user?.email]);

  const verifyEmailCode = useCallback(async (
    verificationCode: string,
    { onSuccess, onError }: CallbackOptions = {}
  ) => {
    if (!user?.id) return null;

    try {
      const result = await verifyEmailChangeCode(user.id, verificationCode);
      if (result) {
        onSuccess?.();
        return result;
      }
      return null;
    } catch (error) {
      console.error('[VERIFY_EMAIL_CODE_ERROR]', error);
      onError?.(error);
      return null;
    }
  }, [user?.id]);

  const confirmEmailUpdate = useCallback(async (
    { onSuccess, onError }: CallbackOptions = {}
  ) => {
    if (!user?.id) return null;

    try {
      const updatedUser = await confirmEmailChange(user.id);
      if (updatedUser) {
        await updateSession({
          user: {
            ...session?.user,
            email: updatedUser.email
          }
        });
        onSuccess?.();
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('[CONFIRM_EMAIL_CHANGE_ERROR]', error);
      onError?.(error);
      return null;
    }
  }, [user?.id, session?.user, updateSession]);

  const updatePassword = useCallback(async (
    oldPassword: string,
    newPassword: string,
    { onSuccess, onError }: CallbackOptions = {}
  ) => {
    if (!user?.id) return null;

    try {
      const updatedUser = await updateUserPassword(user.id, oldPassword, newPassword);
      if (updatedUser) {
        onSuccess?.();
        return updatedUser;
      }
      return null
    } catch (error)  {
      console.error('[UPDATE_PASSWORD_ERROR]', error);
      onError?.(error);
      return null;
    }
  }, [user?.id])

  const updateEmail = useCallback(async (
    email: string,
    { onSuccess, onError }: CallbackOptions = {}
  ) => {
    if (!user?.id) return null;

    try {
      const updatedUser = await updateUserEmail(user.id, email);
      if (updatedUser) {
        await updateSession({
          user: {
            ...session?.user,
            email: updatedUser.email
          }
        });
        onSuccess?.();
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('[UPDATE_EMAIL_ERROR]', error);
      onError?.(error);
      return null;
    }
  }, [user?.id, session?.user, updateSession]);

  const updateName = useCallback(async (
    name: string,
    { onSuccess, onError }: CallbackOptions = {}
  ) => {
    if (!user?.id) return null;
    try {
      const updatedUser = await updateUserName(user.id, name);
      if (updatedUser) {
        await updateSession({
          user: {
            ...session?.user,
            name: updatedUser.name
          }
        });
        onSuccess?.();
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('[UPDATE_NAME_ERROR]', error);
      onError?.(error);
      return null;
    }
  }, [user?.id, session?.user, updateSession]);

  const updateAvatar = useCallback(async (
    file: File,
    { onSuccess, onError }: CallbackOptions = {}
  ) => {
    if (!user?.id) return null;

    try {
      const updatedUser = await updateUserAvatar(user.id, file);
      if (updatedUser) {
        await updateSession({
          user: {
            ...session?.user,
            image: updatedUser.image
          }
        });
        onSuccess?.();
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('[UPDATE_AVATAR_ERROR]', error);
      onError?.(error);
      return null;
    }
  }, [user?.id, session?.user, updateSession]);

  const deleteAvatar = useCallback(async (
    { onSuccess, onError }: CallbackOptions = {}
  ) => {
    if (!user?.id) return null;

    try {
      const updatedUser = await deleteUserAvatar(user.id);
      if (updatedUser) {
        await updateSession({
          user: {
            ...session?.user,
            image: null
          }
        });
        onSuccess?.();
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('[DELETE_AVATAR_ERROR]', error);
      onError?.(error);
      return null;
    }
  }, [user?.id, session?.user, updateSession]);

  return {
    user,
    loading: status === "loading",
    isAuthenticated,
    updateAvatar,
    deleteAvatar,
    updateName,
    updateEmail,
    initiateChangeEmail,
    verifyEmailCode,
    confirmEmailUpdate,
    updatePassword
  }
}
