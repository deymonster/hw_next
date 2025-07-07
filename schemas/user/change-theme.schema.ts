import { z } from 'zod'

export const changeThemeSchema = z.object({
	theme: z.enum(['light', 'dark'])
})

export type TypeChangeThemeSchema = z.infer<typeof changeThemeSchema>
