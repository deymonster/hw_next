'use server'

import { services } from '@/services/index';
import { User } from '@prisma/client';
import { StorageService } from '@/services/storage/storage.service';

const storage = new StorageService()

interface EmailChangeData {
    currentEmail: string;
    newEmail: string;
    code: string;
    step: 'awaiting_verification' | 'verified';
    verifiedAt?: Date;
}

export async function initiateEmailChange(
    userId: string,
    currentEmail: string,
    newEmail: string
): Promise<boolean> {
    if (!userId || !currentEmail || !newEmail) return false;

    try {
        // Проверяем, не занят ли новый email
        const existingUser = await services.data.user.getByEmail(newEmail);
        if (existingUser) {
            throw new Error('Email already taken');
        }

        // Генерируем код подтверждения
        const verificationCode = Math.random().toString(36).slice(-6).toUpperCase();
        
        // Сохраняем данные для смены в кэше
        await services.infrastructure.cache.set(
            `email_change_${userId}`,
            {
                currentEmail,
                newEmail,
                code: verificationCode,
                step: 'awaiting_verification'
            } as EmailChangeData,
            60 * 15 // 15 минут на подтверждение кода
        );

        // Отправляем код на текущий email
        await services.infrastructure.notifications.email.sendChangeEmailVerification(
            currentEmail,
            newEmail,
            verificationCode
        );

        return true;
    } catch (error) {
        console.error('[INITIATE_EMAIL_CHANGE_ERROR]', error);
        return false;
    }
}

export async function verifyEmailChangeCode(
    userId: string,
    verificationCode: string
): Promise<{ currentEmail: string; newEmail: string; } | null> {
    if (!userId || !verificationCode) return null;

    try {
        const changeData = await services.infrastructure.cache.get(`email_change_${userId}`) as EmailChangeData;
        if (!changeData || changeData.code !== verificationCode) {
            throw new Error('Invalid or expired code');
        }

        // Помечаем в кэше что код подтвержден
        await services.infrastructure.cache.set(
            `email_change_${userId}`,
            {
                ...changeData,
                step: 'verified',
                verifiedAt: new Date()
            } as EmailChangeData,
            60 * 5 // 5 минут на финальное подтверждение
        );

        return {
            currentEmail: changeData.currentEmail,
            newEmail: changeData.newEmail
        };
    } catch (error) {
        console.error('[VERIFY_EMAIL_CODE_ERROR]', error);
        return null;
    }
}

export async function confirmEmailChange(userId: string): Promise<User | null> {
    if (!userId) return null;

    try {
        const changeData = await services.infrastructure.cache.get(`email_change_${userId}`) as EmailChangeData;
        if (!changeData || changeData.step !== 'verified') {
            throw new Error('Invalid or expired verification');
        }

        // Обновляем email пользователя
        const updatedUser = await services.data.user.update(userId, {
            email: changeData.newEmail,
            emailVerified: true
        });

        // Очищаем кэш
        await services.infrastructure.cache.delete(`email_change_${userId}`);

        // Отправляем уведомление в Telegram
        if (process.env.ADMIN_TELEGRAM_CHAT_ID) {
            await services.infrastructure.notifications.telegram.sendNotification(
                process.env.ADMIN_TELEGRAM_CHAT_ID,
                `Пользователь ${updatedUser.name} ${changeData.currentEmail} сменил email на ${changeData.newEmail}`
            );
        }

        return updatedUser;
    } catch (error) {
        console.error('[CONFIRM_EMAIL_CHANGE_ERROR]', error);
        return null;
    }
}

export async function updateUserEmail(userId: string, email: string): Promise<User | null> {
    if (!userId || !email) return null
    try {
        const currentUser = await services.data.user.findById(userId)
        if (currentUser) {
            return await services.data.user.update(userId, { email })
        }
        return null
    } catch (error) {
        console.error(`[UPDATE_USER_INFO_ERROR]`, error)
        return null
    }
}

export async function updateUserName(userId: string, name: string): Promise<User | null> {
    if (!userId || !name) return null
    try {
        const currentUser = await services.data.user.findById(userId);
        if (currentUser) {
                return await services.data.user.update(userId, { name })
        }
        return null
    } catch (error) {
        console.error(`[UPDATE_USER_INFO_ERROR]`, error)
        return null
    }
}

export async function getUserById(id: string): Promise<User | null> {
    if (!id) return null;
    try {
        return await services.data.user.findById(id);
    } catch (error) {
        console.error(`[GET_USER_BY_ID_ERROR]`, error);
        return null;
    }
}

export async function getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    try {
        return await services.data.user.getByEmail(email);
    } catch (error) {
        console.error(`[GET_USER_BY_EMAIL_ERROR]`, error);
        return null;
    }
}

export async function updateUserAvatar(userId: string, file: File): Promise<User | null> {
    if (!userId || !file) return null;

    try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const uploadedPath = await storage.uploadFile(
            buffer,
            file.name,
            file.type,
            {
                maxSize: 20 * 1024 * 1024, // 20MB
                allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
            }
        )

        const currentUser = await services.data.user.findById(userId);
        if (currentUser?.image) {
            await storage.deleteFile(currentUser.image)
            console.log('file deleted', currentUser.image)
        }

        return await services.data.user.updateUserImage(userId, uploadedPath);
    } catch (error) {
        console.error(`[UPDATE_USER_AVATAR_ERROR]`, error);
        return null;
    }
}

export async function deleteUserAvatar(userId: string): Promise<User | null> {
    if (!userId) return null;
    try {
        const currentUser = await services.data.user.findById(userId)
        if (currentUser?.image) {
            await storage.deleteFile(currentUser.image)
        }

        const updatedUser = await services.data.user.removeUserImage(userId);
        return updatedUser;
    } catch (error) {
        console.error(`[DELETE_USER_AVATAR_ERROR]`, error);
        return null;
    }
}

export async function updateUserPassword(userId: string, oldPassword: string, newPassword: string): Promise<User | null> {
    if (!userId ) return null;

    try {
        const isPasswordValid = await services.data.user.verifyPassword(userId, oldPassword);
        
        if (isPasswordValid) {
            const updatedUser = await services.data.user.updatePassword(userId, newPassword);
            return updatedUser; 
        }

        return null
        
    } catch(error) {
        console.error(`[UPDATE_USER_PASSWORD_ERROR]`, error)
        throw error
    }
}