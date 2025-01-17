import { z } from 'zod'

export const resetPasswordSchema = z.object({
    email: z.string().email({ message: 'Please enter a valid email address' })
})

export type TypeResetPasswordSchema = z.infer<typeof resetPasswordSchema>