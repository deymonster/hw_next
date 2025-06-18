'use client'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { useAlertRules } from "@/hooks/useAlertRules"
import { toast } from "sonner"
import { AddAlertRuleForm, addAlertRuleSchema } from "@/schemas/alert-rules/addAlertRule.schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Info, Loader2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { AlertCategory, AlertSeverity, ChangeType, ComparisonOperator } from "@/services/prometheus/alerting/alert-rules.types"
import { CreateAlertRuleRequest } from "@/services/prometheus/alerting/alert-rules.config.types"
import { METRIC_CATEGORIES, type AlertRulePreset, ALL_METRICS } from "../alertRulePresets"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"

interface AddAlertRuleModalProps {
    isOpen: boolean
    onClose: () => void
    preset?: AlertRulePreset | null
}

// Предустановленные варианты продолжительности
const DURATION_PRESETS = [
    { value: '30s', label: '30 секунд' },
    { value: '1m', label: '1 минута' },
    { value: '2m', label: '2 минуты' },
    { value: '5m', label: '5 минут' },
    { value: '10m', label: '10 минут' },
    { value: '15m', label: '15 минут' },
    { value: '30m', label: '30 минут' },
    { value: '1h', label: '1 час' },
    { value: '2h', label: '2 часа' },
    { value: '6h', label: '6 часов' },
    { value: '12h', label: '12 часов' },
    { value: '24h', label: '24 часа' }
]

export function AddAlertRuleModal({ isOpen, onClose, preset }: AddAlertRuleModalProps) {
    const t = useTranslations('dashboard.monitoring.alertRules')
    const tEvents = useTranslations('dashboard.monitoring.events')
    const queryClient = useQueryClient()
    const { createRule } = useAlertRules()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [customDuration, setCustomDuration] = useState('')
    const [isDurationCustom, setIsDurationCustom] = useState(false)
    
    const form = useForm<AddAlertRuleForm>({
        resolver: zodResolver(addAlertRuleSchema),
        defaultValues: {
            name: '',
            category: AlertCategory.CUSTOM,
            metric: [],
            threshold: undefined,
            operator: ComparisonOperator.GREATER_THAN,
            duration: '5m',
            severity: AlertSeverity.WARNING,
            description: '',
            enabled: true,
            changeType: undefined
        }
    })
    
    const { isValid } = form.formState
    const watchedOperator = form.watch('operator')
    const watchedThreshold = form.watch('threshold')
    const watchedCategory = form.watch('category')
    const watchedMetric = form.watch('metric')


    // Функция для автоматического определения ChangeType по категории
    const getChangeTypeByCategory = (category: AlertCategory): ChangeType | undefined => {
        switch (category) {
            case AlertCategory.HARDWARE_CHANGE:
                return ChangeType.LABEL_CHANGE
            case AlertCategory.PERFORMANCE:
                return ChangeType.VALUE_CHANGE
            case AlertCategory.HEALTH:
                return ChangeType.LABEL_CHANGE
            case AlertCategory.CUSTOM:
                return undefined // Пользователь выбирает сам
            default:
                return undefined
        }
    }

    // Автозаполнение формы при выборе пресета
    useEffect(() => {
        if (preset) {
            form.setValue('name', preset.name)
            form.setValue('category', preset.category as AlertCategory)
            form.setValue('metric', [preset.metric])
            form.setValue('operator', preset.operator)
            form.setValue('threshold', typeof preset.threshold === 'string' ? parseFloat(preset.threshold) : preset.threshold)
            form.setValue('duration', preset.duration)
            form.setValue('severity', preset.severity)
            form.setValue('description', preset.description)
        }
    }, [preset, form])

    const getCategoryMetrics = useCallback((category: AlertCategory) => {
        switch (category) {
          case AlertCategory.PERFORMANCE:
            return [...METRIC_CATEGORIES.CPU.metrics, ...METRIC_CATEGORIES.DISK.metrics]
          case AlertCategory.HARDWARE_CHANGE:
            return [...METRIC_CATEGORIES.HARDWARE.metrics] // Создаем копию
          case AlertCategory.HEALTH:
            return [...METRIC_CATEGORIES.SYSTEM.metrics, ...METRIC_CATEGORIES.NETWORK.metrics]
          default:
            return [...ALL_METRICS] // Создаем копию
        }
    }, [])
    
    // Автоматическое обновление списка метрик при смене категории
    useEffect(() => {
        if (watchedCategory && !preset) {
            // Автоматически выбираем все метрики для выбранной категории
            const categoryMetrics = getCategoryMetrics(watchedCategory)
            form.setValue('metric', [...categoryMetrics])
        }
    }, [watchedCategory, form, preset, getCategoryMetrics])


    // Функция для выбора всех метрик
    const handleSelectAllMetrics = useCallback(() => {
        form.setValue('metric', [...ALL_METRICS]) // Выбираем все метрики, а не только категории
    }, [form])

    // Функция для снятия выбора всех метрик
    const handleDeselectAllMetrics = useCallback(() => {
        form.setValue('metric', [])
    }, [form])

    const handleModalClose = useCallback(() => {
        form.reset()
        setCustomDuration('')
        onClose()
    }, [form, onClose])

    const onSubmit = async (data: AddAlertRuleForm) => {
        try {
            setIsSubmitting(true)
            // Автоматически определяем changeType для не-CUSTOM категорий
            const changeType = data.category === AlertCategory.CUSTOM 
                ? data.changeType 
                : getChangeTypeByCategory(data.category)
            const createRequest: CreateAlertRuleRequest = {
                name: data.name,
                category: data.category,
                metric: data.metric.join(','),
                threshold: data.threshold,
                operator: data.operator,
                duration: isDurationCustom ? customDuration : data.duration,
                severity: data.severity,
                description: data.description || '',
                enabled: data.enabled,
                changeType: changeType,
                includeInstance: true
            }
            
            await createRule(createRequest)
            queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
            toast.success('Правило успешно создано')
            handleModalClose()
        } catch (error) {
            toast.error('Ошибка при создании правила')
        } finally {
            setIsSubmitting(false)
        }
    }

    const getOperatorLabel = (operator: ComparisonOperator) => {
        switch (operator) {
            case ComparisonOperator.GREATER_THAN:
                return 'Больше (>)'
            case ComparisonOperator.LESS_THAN:
                return 'Меньше (<)'
            case ComparisonOperator.EQUAL:
                return 'Равно (=)'
            case ComparisonOperator.NOT_EQUAL:
                return 'Не равно (!=)'
            case ComparisonOperator.GREATER_EQUAL:
                return 'Больше или равно (>=)'
            case ComparisonOperator.LESS_EQUAL:
                return 'Меньше или равно (<=)'
            default:
                return operator
        }
    }

    const getSeverityLabel = (severity: AlertSeverity) => {
        switch (severity) {
            case AlertSeverity.CRITICAL:
                return 'Критический'
            case AlertSeverity.WARNING:
                return 'Предупреждение'
            case AlertSeverity.INFO:
                return 'Информационный'
            default:
                return severity
        }
    }

    const getCategoryLabel = (category: AlertCategory) => {
        switch (category) {
            case AlertCategory.HARDWARE_CHANGE:
                return 'Изменение оборудования'
            case AlertCategory.PERFORMANCE:
                return 'Производительность'
            case AlertCategory.HEALTH:
                return 'Состояние системы'
            case AlertCategory.CUSTOM:
                return 'Пользовательские'
            default:
                return category
        }
    }
    const availableMetrics = useMemo(() => ALL_METRICS, [])

    const currentCategoryMetrics = useMemo(() => getCategoryMetrics(watchedCategory), [getCategoryMetrics, watchedCategory])

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleModalClose() }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{preset ? `Создать правило: ${preset.name}` : 'Создать правило алерта'}</DialogTitle>
                </DialogHeader>
                
                {/* Информация о выбранном пресете */}
                {preset && (
                    <Alert className="mb-4">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Используется шаблон: <strong>{preset.name}</strong>. 
                            Вы можете изменить любые параметры перед созданием правила.
                        </AlertDescription>
                    </Alert>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Название  */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('table.columns.name')}</FormLabel>
                                        <FormControl>
                                            <Input 
                                                {...field}
                                                disabled={isSubmitting}
                                                placeholder="Введите название правила"
                                                className="text-sm"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Категория */}
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('table.columns.category')}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                            <FormControl>
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue placeholder="Выберите категорию" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.values(AlertCategory).map((category) => (
                                                    <SelectItem key={category} value={category}>
                                                        {getCategoryLabel(category)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Тип изменения - только для CUSTOM категории */}
                        {watchedCategory === AlertCategory.CUSTOM && (
                            <FormField
                                control={form.control}
                                name="changeType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Тип изменения</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                            <FormControl>
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue placeholder="Выберите тип изменения" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={ChangeType.VALUE_CHANGE}>
                                                    Изменение значения
                                                </SelectItem>
                                                <SelectItem value={ChangeType.LABEL_CHANGE}>
                                                    Изменение метки
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        
                        {/* Метрики - множественный выбор через чекбоксы */}
                        <FormField
                            control={form.control}
                            name="metric"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel>{t('table.columns.metric')}</FormLabel>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="default"
                                                onClick={handleSelectAllMetrics}
                                                disabled={isSubmitting || availableMetrics.length === 0}
                                                className="text-xs"
                                            >
                                                Выбрать все
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="default"
                                                onClick={handleDeselectAllMetrics}
                                                disabled={isSubmitting || (field.value?.length || 0) === 0}
                                                className="text-xs"
                                            >
                                                Снять все
                                            </Button>
                                        </div>
                                    </div>
                                    <FormControl>
                                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                                            {availableMetrics.length > 0 ? (
                                                <>
                                                    <div className="text-xs text-muted-foreground mb-2">
                                                        Выбрано: {field.value?.length || 0} из {availableMetrics.length}
                                                    </div>
                                                    {availableMetrics.map((metric) => {
                                                        const isInCurrentCategory = currentCategoryMetrics.includes(metric)
                                                        return (
                                                            <div key={metric} className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={metric}
                                                                    checked={field.value?.includes(metric) || false}
                                                                    onCheckedChange={(checked) => {
                                                                        const currentValue = field.value || []
                                                                        if (checked) {
                                                                            field.onChange([...currentValue, metric])
                                                                        } else {
                                                                            field.onChange(currentValue.filter(m => m !== metric))
                                                                        }
                                                                    }}
                                                                    disabled={isSubmitting}
                                                                />
                                                                <label 
                                                                    htmlFor={metric} 
                                                                    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                                                                        isInCurrentCategory ? 'text-foreground' : 'text-muted-foreground'
                                                                    }`}
                                                                >
                                                                    {metric}
                                                                    {isInCurrentCategory && <span className="ml-1 text-xs text-blue-500">●</span>}
                                                                </label>
                                                            </div>
                                                        )
                                                    })}
                                                </>
                                            ) : (
                                                <div className="text-sm text-muted-foreground">
                                                    Нет доступных метрик для выбранной категории
                                                </div>
                                            )}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        {/* Оператор сравнения */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="operator"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Оператор сравнения</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                            <FormControl>
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue placeholder="Выберите оператор" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.values(ComparisonOperator).map((operator) => (
                                                    <SelectItem key={operator} value={operator}>
                                                        {getOperatorLabel(operator)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            {/* Пороговое значение */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="threshold"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('table.columns.threshold')}</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    placeholder="Например: 80" 
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        field.onChange(value === '' ? undefined : Number(value));
                                                    }}
                                                    disabled={isSubmitting}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            {/* Продолжительность */}
                            <FormField
                                control={form.control}
                                name="duration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('table.columns.duration')}</FormLabel>
                                        <div className="space-y-2">
                                        <Select 
                                                onValueChange={(value) => {
                                                    if (value === 'custom') {
                                                        setIsDurationCustom(true)
                                                    } else {
                                                        setIsDurationCustom(false)
                                                        field.onChange(value)
                                                    }
                                                }} 
                                                defaultValue={field.value} 
                                                disabled={isSubmitting}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="text-sm">
                                                        <SelectValue placeholder="Выберите продолжительность" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {DURATION_PRESETS.map((preset) => (
                                                        <SelectItem key={preset.value} value={preset.value}>
                                                            {preset.label}
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="custom">Пользовательское значение</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {isDurationCustom && (
                                                <Input
                                                    value={customDuration}
                                                    onChange={(e) => setCustomDuration(e.target.value)}
                                                    placeholder="Например: 30s, 5m, 1h"
                                                    className="text-sm"
                                                    disabled={isSubmitting}
                                                />
                                            )}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        {/* Приоритет */}
                        <FormField
                            control={form.control}
                            name="severity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('table.columns.severity')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                        <FormControl>
                                            <SelectTrigger className="text-sm">
                                                <SelectValue placeholder="Выберите приоритет" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                                {Object.values(AlertSeverity).map((severity) => (
                                                    <SelectItem key={severity} value={severity}>
                                                        {getSeverityLabel(severity)}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Описание */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Описание</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            {...field}
                                            disabled={isSubmitting}
                                            placeholder="Описание правила алерта"
                                            className="text-sm min-h-[80px]"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Активное правило */}
                        <FormField
                            control={form.control}
                            name="enabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-sm font-medium">
                                            Активировать правило
                                        </FormLabel>
                                        <div className="text-xs text-muted-foreground">
                                            Правило будет активно сразу после создания
                                        </div>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={isSubmitting}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        
                        {/* Информация о правиле */}
                        {(watchedOperator && watchedThreshold !== undefined && watchedMetric?.length > 0) && (
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    Правило сработает, когда метрики <strong>{watchedMetric.join(', ')}</strong> будут <strong>{getOperatorLabel(watchedOperator).toLowerCase()}</strong> <strong>{watchedThreshold}</strong>
                                </AlertDescription>
                            </Alert>
                        )}
                        <DialogFooter className="gap-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={handleModalClose}
                                disabled={isSubmitting}
                                className="text-xs h-8"
                            >
                                Отмена
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={!isValid || isSubmitting}
                                className="text-xs h-8"
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Создать правило
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}