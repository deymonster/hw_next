import { z } from 'zod'

export const loginSchema = z.object({
	email: z.string().min(1, 'Email обязателен').email('Неверный формат email'),
	password: z.string().min(8, 'Пароль должен содержать минимум 8 символов')
})

export type TypeLoginSchema = z.infer<typeof loginSchema>
