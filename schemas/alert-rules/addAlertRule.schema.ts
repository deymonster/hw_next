import { z } from 'zod'

import {
	AlertCategory,
	AlertSeverity,
	ComparisonOperator
} from '@/services/prometheus/alerting/alert-rules.types'

export const addAlertRuleSchema = z.object({
	name: z.string().min(1, 'Название правила обязательно'),
	category: z.nativeEnum(AlertCategory, {
		errorMap: () => ({ message: 'Выберите категорию' })
	}),
	threshold: z.number().optional(),
	operator: z.nativeEnum(ComparisonOperator).optional(),
	duration: z
		.string()
		.min(1, 'Продолжительность обязательна')
		.optional()
		.or(z.literal('')),
	severity: z.nativeEnum(AlertSeverity),
	description: z.string().optional(),
	enabled: z.boolean().default(true)
})

export type AddAlertRuleForm = z.infer<typeof addAlertRuleSchema>
