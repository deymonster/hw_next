import { User } from '@prisma/client';

// Тип данных для создания пользователя
export interface IUserCreateInput {
    email: string;
    name: string;
    password: string;
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
  }
  