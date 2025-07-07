import { z } from 'zod'

import { languages } from '@/libs/i18n/config'

export const changeLanguageSchema = z.object({
	language: z.enum(languages)
})

export type TypeChangeLanguageSchema = z.infer<typeof changeLanguageSchema>
