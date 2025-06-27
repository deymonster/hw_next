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
import { AlertCategory, AlertSeverity, ComparisonOperator } from "@/services/prometheus/alerting/alert-rules.types"
import { CreateAlertRuleRequest } from "@/services/prometheus/alerting/alert-rules.config.types"
import { METRIC_CATEGORIES, type AlertRulePreset } from "../alertRulePresets"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertRule } from "@prisma/client"

interface AddAlertRuleModalProps {
    isOpen: boolean
    onClose: () => void
    selectedCategory?: AlertCategory | null
    editMode?: boolean
    duplicateMode?: boolean
    ruleToEdit?: AlertRule
}

// Типы для подкатегорий
type SubcategoryData = {
    id: string
    name: string
    description: string
    metrics: Array<{
        name: string
        label: string
        defaultThreshold: number | null
        operator: string
    }>
    requiresThreshold: boolean
    icon: string
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

export function AddAlertRuleModal({ isOpen, onClose, selectedCategory }: AddAlertRuleModalProps) {
    const t = useTranslations('dashboard.monitoring.alertRules')
    const tEvents = useTranslations('dashboard.monitoring.events')
    const queryClient = useQueryClient()
    const { createRule } = useAlertRules()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [customDuration, setCustomDuration] = useState('')
    const [isDurationCustom, setIsDurationCustom] = useState(false)
    const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)

    const form = useForm<AddAlertRuleForm>({
        resolver: zodResolver(addAlertRuleSchema),
        defaultValues: {
            name: '',
            category: AlertCategory.CPU_MONITORING,
            threshold: undefined,
            operator: ComparisonOperator.GREATER_THAN,
            duration: '5m',
            severity: AlertSeverity.WARNING,
            description: '',
            enabled: true
        }
    })
    
    const { isValid } = form.formState
    const watchedOperator = form.watch('operator')
    const watchedThreshold = form.watch('threshold')
    const watchedCategory = form.watch('category')

    // Получаем данные выбранной категории
    const selectedCategoryData = useMemo(() => {
        return METRIC_CATEGORIES[watchedCategory]
    }, [watchedCategory])

    // Получаем подкатегории для выбранной категории (только если они есть)
    const availableSubcategories = useMemo(() => {
        if (!selectedCategoryData || !('subcategories' in selectedCategoryData) || !selectedCategoryData.subcategories) {
            return []
        }
        return Object.values(selectedCategoryData.subcategories)
    }, [selectedCategoryData])
    
    // Получаем данные выбранной подкатегории с правильной типизацией
    const selectedSubcategoryData = useMemo((): SubcategoryData | null => {
        if (!selectedCategoryData || !('subcategories' in selectedCategoryData) || !selectedCategoryData.subcategories || !selectedSubcategory) {
            return null
        }
        const subcategories = selectedCategoryData.subcategories as Record<string, SubcategoryData>
        return subcategories[selectedSubcategory] || null
    }, [selectedCategoryData, selectedSubcategory])

    // Автозаполнение формы при выборе категории
    useEffect(() => {
        if (selectedCategory) {
            form.setValue('category', selectedCategory)
            
            const categoryData = METRIC_CATEGORIES[selectedCategory]
            
            if (categoryData) {
                // Для HARDWARE_CHANGE - особая логика
                if (selectedCategory === AlertCategory.HARDWARE_CHANGE) {
                    form.setValue('name', 'Контроль изменения оборудования')
                    form.setValue('description', categoryData.description)
                    form.setValue('threshold', undefined)
                    form.setValue('operator', undefined)
                    form.setValue('severity', AlertSeverity.CRITICAL)
                } else {
                    // Для категорий с подкатегориями
                    if ('subcategories' in categoryData && categoryData.subcategories) {
                        const subcategories = categoryData.subcategories as Record<string, SubcategoryData>
                        const firstSubcategory = Object.keys(subcategories)[0]
                        setSelectedSubcategory(firstSubcategory)
                        
                        const firstSubcategoryData = subcategories[firstSubcategory]
                        const firstMetric = firstSubcategoryData.metrics[0]
                        
                        form.setValue('name', firstSubcategoryData.name)
                        form.setValue('description', firstSubcategoryData.description)
                        
                        if (firstMetric) {
                            form.setValue('threshold', firstMetric.defaultThreshold ?? undefined)
                            form.setValue('operator', firstMetric.operator as ComparisonOperator)
                        }
                    }
                }
            }
        }
    }, [selectedCategory, form])

    // Автоматическое обновление при смене категории
    useEffect(() => {
        if (watchedCategory && !selectedCategory) {
            const categoryData = METRIC_CATEGORIES[watchedCategory]
            
            if (categoryData) {
                // Сброс подкатегории при смене категории
                setSelectedSubcategory(null)
                
                if (watchedCategory === AlertCategory.HARDWARE_CHANGE) {
                    form.setValue('threshold', undefined)
                    form.setValue('operator', undefined)
                } else if ('subcategories' in categoryData && categoryData.subcategories) {
                    // Автоматически выбираем первую подкатегорию
                    const subcategories = categoryData.subcategories as Record<string, SubcategoryData>
                    const firstSubcategory = Object.keys(subcategories)[0]
                    setSelectedSubcategory(firstSubcategory)
                    
                    const firstSubcategoryData = subcategories[firstSubcategory]
                    const firstMetric = firstSubcategoryData.metrics[0]
                    
                    if (firstMetric) {
                        form.setValue('threshold', firstMetric.defaultThreshold ?? undefined)
                        form.setValue('operator', firstMetric.operator as ComparisonOperator)
                    }
                }
            }
        }
    }, [watchedCategory, form, selectedCategory])

    // Автоматическое обновление при смене подкатегории
    useEffect(() => {
        if (selectedSubcategory && selectedSubcategoryData) {
            const firstMetric = selectedSubcategoryData.metrics[0]
            
            if (firstMetric) {
                form.setValue('threshold', firstMetric.defaultThreshold ?? undefined)
                form.setValue('operator', firstMetric.operator as ComparisonOperator)
            }
        }
    }, [selectedSubcategory, selectedSubcategoryData, form])

    const handleModalClose = useCallback(() => {
        form.reset()
        setCustomDuration('')
        setSelectedSubcategory(null)
        onClose()
    }, [form, onClose])

    const extractMetricData = (categoryData: any, subcategoryData: SubcategoryData | null, isHardwareChange: boolean) => {
        if (isHardwareChange) {
            return {
                metric: categoryData.metrics[0] as string,
                defaultOperator: undefined,
                defaultThreshold: null
            }
        }
        
        // Если есть подкатегория, используем её метрики
        if (subcategoryData) {
            const firstMetric = subcategoryData.metrics[0]
            
            return {
                metric: firstMetric.name,
                defaultOperator: firstMetric.operator,
                defaultThreshold: firstMetric.defaultThreshold
            }
        }
        
        return {
            metric: '',
            defaultOperator: undefined,
            defaultThreshold: null
        }
    }

    const onSubmit = async (data: AddAlertRuleForm) => {
        try {
            setIsSubmitting(true)
            const categoryData = METRIC_CATEGORIES[data.category as keyof typeof METRIC_CATEGORIES]
            const isHardwareChange = data.category === 'HARDWARE_CHANGE'

            // Извлекаем метрику и параметры по умолчанию
            const { metric, defaultOperator, defaultThreshold } = extractMetricData(
                categoryData, 
                selectedSubcategoryData, 
                isHardwareChange
            )

            // Создаем базовый запрос
            const createRequest: CreateAlertRuleRequest = {
                name: data.name,
                description: data.description || '',
                category: data.category,
                metric,
                severity: data.severity,
                enabled: data.enabled,
                duration: isHardwareChange ? '0s' : (data.duration || '5m')
            }
            
            // Добавляем специфичные для мониторинга поля
            if (!isHardwareChange) {
                createRequest.threshold = data.threshold ?? defaultThreshold ?? 0
                createRequest.operator = data.operator || defaultOperator as ComparisonOperator
            }
            
            await createRule(createRequest)
            toast.success('Правило алерта успешно создано')
            handleModalClose()
        } catch (error) {
            console.error('Error creating alert rule:', error)
            if (error instanceof Error && error.message.includes('уже существует')) {
            toast.error(t('Правило с указанными параметрами уже существует'))
            } else {
                toast.error(t('Ошибка при создании правила'))
            }
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
        const categoryData = METRIC_CATEGORIES[category]
        return categoryData ? categoryData.name : category
    }

    // Проверяем, нужно ли показывать поля threshold и operator
    const shouldShowThresholdFields = watchedCategory !== AlertCategory.HARDWARE_CHANGE

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleModalClose() }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {selectedCategory ? `Создать правило: ${getCategoryLabel(selectedCategory)}` : 'Создание правила алерта'}
                    </DialogTitle>
                </DialogHeader>
                
                {/* Информация о выбранной категории */}
                {selectedCategory && (
                    <Alert className="mb-4">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Используется категория: <strong>{getCategoryLabel(selectedCategory)}</strong>. 
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

                        {/* Подкатегория (тип мониторинга) - показываем только если есть подкатегории */}
                        {availableSubcategories.length > 0 && (
                            <FormItem>
                                <FormLabel>Тип мониторинга</FormLabel>
                                <Select 
                                    onValueChange={setSelectedSubcategory} 
                                    value={selectedSubcategory || ''} 
                                    disabled={isSubmitting}
                                >
                                    <FormControl>
                                        <SelectTrigger className="text-sm">
                                            <SelectValue placeholder="Выберите тип мониторинга" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {availableSubcategories.map((subcategory) => (
                                            <SelectItem key={subcategory.id} value={subcategory.id}>
                                                {subcategory.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                        
                        {/* Поля threshold и operator - показываем только если не HARDWARE_CHANGE */}
                        {shouldShowThresholdFields && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Оператор сравнения */}
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
                                                        onBlur={() => {
                                                            if (customDuration) {
                                                                field.onChange(customDuration)
                                                            }
                                                        }}
                                                        placeholder="Например: 10m, 1h, 30s"
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
                        )}

                        {/* Приоритет */}
                        <FormField
                            control={form.control}
                            name="severity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Приоритет</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                                        <FormControl>
                                            <SelectTrigger className="text-sm">
                                                <SelectValue placeholder="Выберите серьезность" />
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
                                            placeholder="Введите описание правила (необязательно)"
                                            className="text-sm min-h-[80px]"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Включено */}
                        <FormField
                            control={form.control}
                            name="enabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Включить правило</FormLabel>
                                        <div className="text-sm text-muted-foreground">
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

                        {/* Сводка правила */}
                        <div className="rounded-lg border p-4 bg-muted/50">
                            <h4 className="font-medium mb-2">Сводка правила:</h4>
                            <div className="text-sm space-y-1">
                                <p><strong>Категория:</strong> {getCategoryLabel(watchedCategory)}</p>
                                {selectedSubcategoryData && (
                                    <p><strong>Тип мониторинга:</strong> {selectedSubcategoryData.name}</p>
                                )}
                                {shouldShowThresholdFields && (
                                    <>
                                        <p><strong>Условие:</strong> {watchedOperator ? getOperatorLabel(watchedOperator) : 'Не выбрано'} {watchedThreshold}</p>
                                        <p><strong>Продолжительность:</strong> {form.watch('duration')}</p>
                                    </>
                                )}
                                <p><strong>Серьезность:</strong> {getSeverityLabel(form.watch('severity'))}</p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleModalClose} disabled={isSubmitting}>
                                Отмена
                            </Button>
                            <Button type="submit" disabled={!isValid || isSubmitting}>
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