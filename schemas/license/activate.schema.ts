import { z } from 'zod'

export const activateSchema = z.object({
	inn: z
		.string()
		.min(10, {
			message: 'ИНН должен содержать минимум 10 цифр'
		})
		.max(12, {
			message: 'ИНН должен содержать максимум 12 цифр'
		})
		.regex(/^\d+$/, {
			message: 'ИНН должен состоять только из цифр'
		})
})

export type TypeActivateSchema = z.infer<typeof activateSchema>
