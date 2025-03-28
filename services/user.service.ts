import { PrismaClient, User } from "@prisma/client";
import { BaseRepository } from "./base.service";
import { IUserCreateInput, IUserFindManyArgs, IUserRepository, IUserUpdateInput } from './user.interfaces';

import { TypeCreateAccountSchema } from "@/schemas/auth/create-account.schema";
import * as bcrypt from 'bcryptjs';
import { sendMail } from '@/libs/send-mail';
import crypto from "crypto";
import { AUTH_ERRORS } from "@/libs/auth/constants";

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

    async getByResetToken(token: string): Promise<User | null> {
        return await this.model.findUnique({
          where: { resetToken: token },
        });
    }

    async createUser(data: TypeCreateAccountSchema): Promise<{ success: boolean; user?: Omit<User, 'password'>; error?: string }>  {
        try {
            // Проверяем, существует ли пользователь
            const existingUser = await this.getByEmail(data.email);

            if (existingUser) {
                return {
                    success: false,
                    error: AUTH_ERRORS.EMAIL_ALREADY_EXISTS
                };
            }

            // Хэшируем пароль
            const hashedPassword = await bcrypt.hash(data.password, 10);
            
            // Генерация токена для подтверждения
            const verificationToken = crypto.randomBytes(32).toString("hex");

            // Создаем пользователя
            const user = await this.model.create({
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

    async createResetToken(userId: string): Promise<string> {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() +  5 * 60 * 1000); // 24 часа

        await this.update(userId, {
            resetToken: token,
            resetTokenExpires: expires
        });

        return token;
    }

    async verifyResetToken(token: string): Promise<string | null> {
        const user = await this.getByResetToken(token);  // Нужно отдельный метод getByResetToken!
        if (user && user.resetTokenExpires && user.resetTokenExpires > new Date()) {
          return user.id;
        }
        return null;
    }

    async updatePassword(userId: string, newPassword: string): Promise<User> {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        return await this.update(userId, {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpires: null
      });
    }

    async verifyPassword(userId: string, password: string): Promise<boolean> {

        const user = await this.findById(userId)
        if (!user) {
            throw new Error('User not found');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }
        return true;
    }

    async sendPasswordResetEmail(email: string, token: string): Promise<void> {
        const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/account/recovery/${token}`;
        
        await sendMail({
          sendTo: email,
          subject: 'Reset your password',
          text: `You requested to reset your password. Click the link below to set a new password: ${resetLink}`,
          html: `
            <p>You requested to reset your password.</p>
            <p>Click the link below to set a new password:</p>
            <a href="${resetLink}">Reset Password</a>
            <p>If you didn't request this, please ignore this email.</p>
            <p>The link will expire in 24 hours.</p>
          `
        });

        // Если включены уведомления в Telegram
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
          // await this.telegram.sendMessage(
          //   process.env.TELEGRAM_CHAT_ID,
          //   `Reset password link: ${resetLink}`
          // );
        }
    }

    async update(id: string, data: Partial<IUserUpdateInput>): Promise<User> {
        return await this.model.update({ where: { id }, data });
    }

    async updateUserImage(userId: string, imageUrl: string): Promise<User> {
        try {
            console.log('ImageUrl in user service', imageUrl)
            const updatedUser = await this.update(
                userId, {
                    image: imageUrl,
                    updatedAt: new Date()
                }
            )
            return updatedUser
        } catch (error) {
            console.error('[UPDATE_USER_IMAGE_ERROR]', error);
            throw new Error('Failed to update user image')
        }
    }

    async removeUserImage(userId: string): Promise<User> {
        try {
            const updatedUser = await this.update(
                userId, {
                    image: null,
                    updatedAt: new Date()
                }
            )
            return updatedUser
        } catch (error) {
            console.error('[REMOVE_USER_IMAGE_ERROR]', error);
            throw new Error('Failed to remove user image')
        }
    }
}
