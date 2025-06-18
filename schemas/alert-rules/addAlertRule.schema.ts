import { z } from "zod";
import { AlertCategory, AlertSeverity, ChangeType, ComparisonOperator } from "@/services/prometheus/alerting/alert-rules.types";

export const addAlertRuleSchema = z.object({
    name: z.string().min(1, 'Название правила обязательно'),
    category: z.nativeEnum(AlertCategory, {
        errorMap: () => ({ message: 'Выберите категорию' })
    }),
    metric: z.array(z.string()).min(1, 'Выберите хотя бы одну метрику'),
    threshold: z.number().optional(), 
    operator: z.nativeEnum(ComparisonOperator).optional(),
    duration: z.string().min(1, 'Продолжительность обязательна'),
    severity: z.nativeEnum(AlertSeverity),
    description: z.string().optional(),
    enabled: z.boolean().default(true),
    changeType: z.nativeEnum(ChangeType).optional()
    
})

export type AddAlertRuleForm = z.infer<typeof addAlertRuleSchema>