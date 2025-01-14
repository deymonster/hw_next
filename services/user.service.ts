import { PrismaClient, User } from "@prisma/client";
import { BaseRepository } from "./base.service";
import { IUserCreateInput, IUserFindManyArgs, IUserRepository } from './user.interfaces';

import { TypeCreateAccountSchema } from "@/schemas/auth/create-account.schema";
import * as bcrypt from 'bcryptjs';
import { sendMail } from '@/libs/send-mail';
import crypto from "crypto";


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
    
    async getByToken(token: string): Promise<User | null> {
        return await this.model.findUnique({
          where: { verificationToken: token },
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
            
            // Генерация токена для подтверждения
            const verificationToken = crypto.randomBytes(32).toString("hex");

            // Создаем пользователя
            const user = await this.prisma.user.create({
                data: {
                    email: data.email,
                    name: data.username,
                    password: hashedPassword,
                    verificationToken,
                }
            });

            // Формируем ссылку подтверждения
            const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/account/verify-email?token=${verificationToken}`;

            // Отправляем письмо с подтверждением
            const html = `
            <html>
                <body>
                <h1>Подтверждение email</h1>
                <p>Здравствуйте, ${data.username}!</p>
                <p>Пожалуйста, подтвердите вашу почту, перейдя по ссылке ниже:</p>
                <a href="${verificationLink}" target="_blank">Подтвердить Email</a>
                <p>Если вы не регистрировались, просто проигнорируйте это письмо.</p>
                </body>
            </html>
            `;

            try {
                await sendMail({
                    sendTo: data.email,
                    subject: "Подтверждение регистрации",
                    text: `Пожалуйста, подтвердите вашу почту: ${verificationLink}`,
                    html,
                });
            } catch (mailError: any) {
                console.error("[SEND_MAIL_ERROR]", mailError);

                // Удаляем пользователя, если письмо не отправлено
                await this.prisma.user.delete({ where: { id: user.id } });

                return {
                    success: false,
                    error: `Ошибка при отправке письма подтверждения: ${mailError.message}`,
                };
            }

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
