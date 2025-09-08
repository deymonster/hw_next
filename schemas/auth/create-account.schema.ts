import { z } from 'zod'

export const createAccountSchema = z.object({
	username: z
		.string()
		.min(1, 'Имя пользователя обязательно')
		.regex(
			/^[a-zA-Zа-яА-Я0-9\u0401\u0451]+(?:-[a-zA-Zа-яА-Я0-9\u0401\u0451]+)*$/,
			'Имя пользователя может содержать только буквы, цифры и дефисы'
		),
	email: z
		.string()
		.min(1, 'Email обязателен')
		.email('Пожалуйста, введите корректный email адрес'),
	password: z.string().min(8, 'Пароль должен содержать минимум 8 символов')
})

export type TypeCreateAccountSchema = z.infer<typeof createAccountSchema>
