import { z } from 'zod'

export const changeNotificationsSchema = z.object({
	siteNotifications: z.boolean(),
	telegramNotifications: z.boolean()
})

export type TypeChangeNotificationsSettingsSchema = z.infer<
	typeof changeNotificationsSchema
>
