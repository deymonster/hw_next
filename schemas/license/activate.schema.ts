import { z } from 'zod'

export const activateSchema = z.object({
	inn: z
		.string()
		.min(10, {
			message: 'ИНН должен содержать минимум 10 символов'
		})
		.max(12, {
			message: 'ИНН должен содержать максимум 12 символов'
		})
		.regex(/^\d+$/, {
			message: 'ИНН должен содержать только цифры'
		})
})

export type TypeActivateSchema = z.infer<typeof activateSchema>
