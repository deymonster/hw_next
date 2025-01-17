import { User } from '@prisma/client';

// Тип данных для создания пользователя
export interface IUserCreateInput {
    email: string;
    name: string;
    password: string;
    emailVerified?: boolean;
    verificationToken?: string | null;
    resetToken?: string | null;
    resetTokenExpires?: Date | null;
  }
  
// Тип параметров для поиска пользователей
export interface IUserFindManyArgs {
  where?: { email?: string; name?: string };
  take?: number;
  skip?: number;
}

// Интерфейс для дополнительных методов репозитория пользователя
export interface IUserRepository {
  getByEmail(email: string): Promise<User | null>;
  getByToken(token: string): Promise<User | null>;
  createResetToken(userId: string): Promise<string>;
  verifyResetToken(token: string): Promise<string | null>; // Возвращает userId если токен валиден
  updatePassword(userId: string, newPassword: string): Promise<User>;
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}
