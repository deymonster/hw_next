'use server'

import { TypeCreateAccountSchema } from '@/schemas/auth/create-account.schema';
import { services } from '@/services/index';

export async function createUser(data: TypeCreateAccountSchema) {
  try {
    const result = await services.user.createUser(data);
    if ('error' in result) {
      return { error: result.error };
    }
    return { success: true, user: result.user };
  } catch (error) {
    console.error("[CREATE_USER_ACTION_ERROR]", error);
    return { error: "Не удалось создать пользователя" };
  }
}
