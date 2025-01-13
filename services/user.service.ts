import { PrismaClient, User } from "@prisma/client";
import { BaseRepository } from "./base.service";
import { IUserCreateInput, IUserFindManyArgs, IUserRepository } from './user.interfaces';

import { TypeCreateAccountSchema } from "@/schemas/auth/create-account.schema";
import * as bcrypt from 'bcryptjs';


export class UserService 
    extends BaseRepository<User, IUserCreateInput, IUserFindManyArgs, PrismaClient['user'], string>
    implements IUserRepository
{
    constructor(prisma: PrismaClient) {
        super(prisma, (p) => p.user);
    }

    async getByEmail(email: string): Promise<User | null> {
        return await this.model.findUnique({
          where: { email },
        });
      }

    async createUser(data: TypeCreateAccountSchema): Promise<{ success: boolean; user?: Omit<User, 'password'>; error?: string }>  {
        try {
            // Проверяем, существует ли пользователь
            const existingUser = await this.getByEmail(data.email);

            if (existingUser) {
                return {
                    success: false,
                    error: "Пользователь с таким email уже существует"
                };
            }

            // Хэшируем пароль
            const hashedPassword = await bcrypt.hash(data.password, 10);

            // Создаем пользователя
            const user = await this.prisma.user.create({
                data: {
                    email: data.email,
                    name: data.username,
                    password: hashedPassword
                }
            });

            // Возвращаем успех, но без пароля
            const { password, ...userWithoutPassword } = user;
            return {
                success: true,
                user: userWithoutPassword
            };

        } catch (error) {
            console.error('[CREATE_USER_ERROR]', error);
            return {
                success: false,
                error: "Произошла ошибка при создании пользователя"
            };
        }
    }
}
