import { z } from 'zod'

export const changeEmailSchema = z.object({
	newEmail: z.string().email(),
	verificationCode: z.string().optional()
})

export type TypeChangeEmailSchema = z.infer<typeof changeEmailSchema>
