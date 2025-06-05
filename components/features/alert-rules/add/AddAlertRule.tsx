'use client'

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Plus, Settings } from "lucide-react"
import { useState } from "react"
import { AddAlertRuleModal } from "./forms/AddModal"
import { ALERT_RULE_PRESETS, AlertRulePreset, PRESET_CATEGORIES } from "./alertRulePresets"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdowmmenu"
import { AlertCategory } from "@/services/prometheus/alerting/alert-rules.types"


export function AddAlertRule() {
    const t = useTranslations('dashboard.monitoring.alertRules')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedPreset, setSelectedPreset] = useState<AlertRulePreset | null>(null)


    const handlePresetSelect = (preset: AlertRulePreset) => {
        setSelectedPreset(preset)
        setIsModalOpen(true)
    }

    const handleCustomRule = () => {
        setSelectedPreset(null)
        setIsModalOpen(true)
    }

    const handleModalClose = () => {
        setIsModalOpen(false)
        setSelectedPreset(null)
    }

    const getPresetsByCategory = (category: AlertCategory) => {
        return ALERT_RULE_PRESETS.filter(preset => preset.category === category)
    }

    return (
        <div className='flex items-center gap-x-4'>
            {/* Кнопка быстрого создания */}
            <Button onClick={handleCustomRule} className="text-xs h-8 px-3">
                <Plus className="mr-2 h-4 w-4" />
                {t('addRule')}
            </Button>

            {/* Dropdown с преднастройками */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="text-xs h-8 px-3">
                        <Settings className="mr-2 h-4 w-4" />
                        Преднастройки
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Готовые шаблоны</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* Динамическая группировка по категориям */}
                    {PRESET_CATEGORIES.map((category, index) => {
                        const categoryPresets = getPresetsByCategory(category.id)
                        
                        // Показываем категорию только если есть пресеты
                        if (categoryPresets.length === 0) return null
                        
                        return (
                            <div key={category.id}>
                                {index > 0 && <DropdownMenuSeparator />}
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal flex items-center gap-2">
                                    <span>{category.icon}</span>
                                    {category.name}
                                </DropdownMenuLabel>
                                {categoryPresets.map((preset) => (
                                    <DropdownMenuItem 
                                        key={preset.id}
                                        onClick={() => handlePresetSelect(preset)}
                                        className="text-xs"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium">{preset.name}</span>
                                            <span className="text-muted-foreground text-xs">
                                                {preset.description}
                                            </span>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        )
                    })}

                    {/* Если нет пресетов */}
                    {ALERT_RULE_PRESETS.length === 0 && (
                        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                            Нет доступных шаблонов
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AddAlertRuleModal 
                isOpen={isModalOpen}
                onClose={handleModalClose}
                preset={selectedPreset}
            />
        </div>
    )
}