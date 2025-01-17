'use server'

import { TypeCreateAccountSchema } from '@/schemas/auth/create-account.schema';
import { TypeResetPasswordSchema } from '@/schemas/auth/reset-password.shema';
import { TypeNewPasswordSchema } from "@/schemas/auth/new-password.schema";
import { services } from '@/services/index';
import { auth, signIn, signOut } from "@/auth"
import { AUTH_ERRORS } from '@/libs/auth/constants';

export async function updatePasswordWithToken(token: string, data: TypeNewPasswordSchema) {
  try {
    // 1. Проверяем токен на валидность
    const userId = await services.user.verifyResetToken(token);
    if (!userId) {
      return { error: AUTH_ERRORS.INVALID_TOKEN };
    }
    // 2. Обновляем пароль пользователя
    await services.user.updatePassword(userId, data.password);
    return { success: true, message: "Пароль успешно обновлен" };
  } catch (error) {
    console.error("[UPDATE_PASSWORD_ACTION_ERROR]", error);
    return { error: AUTH_ERRORS.UPDATE_PASSWORD_FAILED };
  }
}

export async function resetPassword(data: TypeResetPasswordSchema) {
  try {
    const { email } = data;
    // 1. Находим пользователя по email
    const user = await services.user.getByEmail(email);
    if (!user) {
      return { error: AUTH_ERRORS.USER_NOT_FOUND };
    }

    // 2. Создаем токен для сброса пароля
    const resetToken = await services.user.createResetToken(user.id);

    // 3. Отправляем письмо с ссылкой для сброса пароля
    await services.user.sendPasswordResetEmail(email, resetToken);

    return { success: true, message: "Письмо с инструкцией по сбросу пароля отправлено на ваш email" };

  } catch (error) {
    console.error("[RESET_PASSWORD_ACTION_ERROR]", error);
    return { error: AUTH_ERRORS.RESET_PASSWORD_FAILED };
  }
}


export async function createUser(data: TypeCreateAccountSchema) {
  try {
    const result = await services.user.createUser(data);
    if ('error' in result) {
      return { error: result.error };
    }
    return { success: true, user: result.user };
  } catch (error) {
    console.error("[CREATE_USER_ACTION_ERROR]", error);
    return { error: AUTH_ERRORS.CREATE_USER_FAILED };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    const callbackUrl = prevState || '/settings'

    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false,
      callbackUrl
    })

    return { success: true, callbackUrl }
  } catch (error: any) {
    // Получаем сообщение из вложенной ошибки
    if (error?.cause?.err?.message) {
      return { error: error.cause.err.message }
    }
    
    return { error: 'AUTHENTICATION_FAILED' }
  }
}

// Получение данных текущего пользователя
export async function getCurrentUser() {
  try {
    const session = await auth()
    return session?.user
  } catch (error) {
    return null
  }
}

export async function logout() {
  await signOut()
}
