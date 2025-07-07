import { z } from 'zod'

export const addDepartmentSchema = z.object({
	name: z.string().min(1, 'Название отдела обязательно'),
	description: z.string().optional()
})

export type AddDepartmentForm = z.infer<typeof addDepartmentSchema>
