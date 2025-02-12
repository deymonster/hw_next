import { z } from 'zod'

export const changeTelegramSettingsSchema = z.object({
    botToken: z
        .string()
        .min(1, "Bot token is required")
        .regex(/^\d+:[A-Za-z0-9_-]+$/, "Invalid bot token format"),
    chatId: z
        .string()
        .min(1, "Chat ID is required")
        .regex(/^-?\d+$/, "Chat ID must be a number")
})

export type TypeChangeTelegramSettingsSchema = z.infer<typeof changeTelegramSettingsSchema>