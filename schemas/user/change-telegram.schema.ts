import { z } from 'zod'

export const changeTelegramSettingsSchema = z.object({
	botToken: z
		.string()
		.min(1, 'Bot token is required')
		.regex(/^\d+:[A-Za-z0-9_-]+$/, 'Invalid bot token format')
})

export type TypeChangeTelegramSettingsSchema = z.infer<
	typeof changeTelegramSettingsSchema
>
