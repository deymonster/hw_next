'use server'

import { services } from '@/services/index';
import { User } from '@prisma/client';
import { StorageService } from '@/services/storage/storage.service';

const storage = new StorageService()

export async function updateUserName(userId: string, name: string): Promise<User | null> {
    if (!userId || !name) return null
    try {
        const currentUser = await services.user.findById(userId);
        if (currentUser) {
                return await services.user.update(userId, { name })
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
        return await services.user.findById(id);
    } catch (error) {
        console.error(`[GET_USER_BY_ID_ERROR]`, error);
        return null;
    }
}

export async function getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    try {
        return await services.user.getByEmail(email);
    } catch (error) {
        console.error(`[GET_USER_BY_EMAIL_ERROR]`, error);
        return null;
    }
}

export async function updateUserAvatar(userId: string, file: File): Promise<User | null> {
    if (!userId || !file) return null;

    try {
        // upload file first
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
        

        const currentUser = await services.user.findById(userId);
        if (currentUser?.image) {
            await storage.deleteFile(currentUser.image)
            console.log('file deleted', currentUser.image)
        }

        return await services.user.updateUserImage(userId, uploadedPath);
    } catch (error) {
        console.error(`[UPDATE_USER_AVATAR_ERROR]`, error);
        return null;
    }
}

export async function deleteUserAvatar(userId: string): Promise<User | null> {
    console.log('Starting deleteUserAvatar for userId:', userId)
    if (!userId) return null;
    try {
        const currentUser = await services.user.findById(userId)
        console.log('Current user:', currentUser)
        if (currentUser?.image) {
            await storage.deleteFile(currentUser.image)
            
        }

        const updatedUser = await services.user.removeUserImage(userId);
        console.log('User after removing image:', updatedUser)
        return updatedUser;
    } catch (error) {
        console.error(`[DELETE_USER_AVATAR_ERROR]`, error);
        return null;
    }
}