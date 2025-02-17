'use server'

import { services } from "@/services"


const { telegram } = services.infrastructure.notifications
const { telegram_settings } = services.data

export async function getTelegramSettings(userId: string) {
    return telegram_settings.findByUserId(userId)
}


export async function verifyTelegramBotAction(token:  string) {
    return telegram.verifyBot(token)
}


export async function saveTelegramSettings(
    userId: string, 
    data: {
        botToken: string,
        botUsername: string,
    }
) {
    return telegram_settings.update(
        userId, {
            botToken: data.botToken,
            botUsername: data.botUsername,
            isActive: false,
            telegramChatId: null
        }
    )
}

export async function startTelegramBot(userId: string) {
    return telegram.startBot(
        userId,
        async (chatId, username, firstName) => {
            await telegram_settings.update(
                userId, {
                    telegramChatId: chatId,
                    username: username || undefined,
                    firstName: firstName || undefined,
                    isActive: true,
                    lastInteractionAt: new Date()
                }
            )
            await telegram.stopBot()
        }
    )
}


export async function sendTelegramMessage(userId: string, message: string) {
    const settings = await telegram_settings.findByUserId(userId)
    if (!settings?.telegramChatId || !settings.isActive) {
        throw new Error('Telegram bot is not configured properly')
    }

    return telegram.sendNotification(
        userId,
        settings.telegramChatId,
        message
    )
}

export async function checkTelegramAvailability(userId: string): Promise<{
    isAvailable: boolean,
    error?: string
}> {
    try {
        const settings = await services.data.telegram_settings.findByUserId(userId)

        if (!settings) {
            return {
                isAvailable: false,
                error: 'Telegram settings not found'
            }
        }

        // check all nessesary fields
        const missingFileds = []
        if (!settings.isActive) missingFileds.push('bot is not activa')
        if (!settings.telegramChatId) missingFileds.push('chat is not connected')
        if (!settings.botToken) missingFileds.push('bot token is missing')
        
        if (missingFileds.length > 0) {
        return {
            isAvailable: false,
            error: `Telegram bot is not configured properly: ${missingFileds.join(', ')}`
        }
        }

        
        return {
            isAvailable: true
        }
    } catch (error) {
        console.error('[CHECK_TELEGRAM_AVAILABILITY_ERROR]', error)
        return {
            isAvailable:  false,
            error: 'Failed to check Telegram availability'
        }
    }
}