'use client'

import { useTranslations } from "next-intl"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/elements/DataTable"

import { useAlertRules } from "@/hooks/useAlertRules"
import { AlertRule } from "@prisma/client"
import { ArrowLeft, Plus, RefreshCw } from "lucide-react"
import { createAlertRulesColumns } from "./AlertRulesColumns"

export function AlertRulesTable() {
    const t = useTranslations('dashboard.monitoring.alertRules')
    const { alertRules, isLoading, error, refetch } = useAlertRules()
    const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const columns = useMemo(() => createAlertRulesColumns((key: string) => t(key)), [t])

    const selectedRule = useMemo(() => {
        if (!selectedRuleId || !alertRules) return null
        return alertRules.find(rule => rule.id === selectedRuleId) || null
    }, [selectedRuleId, alertRules])

    if (isLoading) {
        return <div className="flex items-center justify-center p-4 text-sm">Загрузка правил...</div>
    }

    const handleRowClick = (rule: AlertRule) => {
        setSelectedRuleId(rule.id)
    }

    const handleSyncWithPrometheus = async () => {
        // TODO: Implement sync with Prometheus
        console.log('Sync with Prometheus')
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-4 text-red-500">
                <p className="text-sm">Ошибка загрузки правил</p>
                <Button onClick={() => refetch()} className="mt-2 text-xs">
                    Повторить
                </Button>
            </div>
        )
    }

    return (
        <>
            {selectedRule ? (
                <div>
                    <Button
                        variant="ghost"
                        onClick={() => setSelectedRuleId(null)}
                        className="mb-4 h-8 text-xs"
                    >
                        <ArrowLeft className="mr-1 h-4 w-3" />
                        {t('backToList')}
                    </Button>
                    {/* <AlertRuleDetail rule={selectedRule} onUpdate={refetch} /> */}
                </div>
            ) : (
                <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button onClick={() => setShowAddModal(true)} className="h-8 text-xs w-full sm:w-auto">
                            <Plus className="mr-1 h-3 w-3" />
                                <span className="hidden sm:inline">{t('addRule')}</span>
                                <span className="sm:hidden">Добавить</span>
                            </Button>
                            <Button variant="outline" onClick={handleSyncWithPrometheus} className="h-8 text-xs w-full sm:w-auto">
                                <RefreshCw className="mr-1 h-3 w-3" />
                                <span className="hidden sm:inline">{t('syncWithPrometheus')}</span>
                                <span className="sm:hidden">Синхронизация</span>
                            </Button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <DataTable
                            columns={columns}
                            data={alertRules || []}
                            onRowClick={handleRowClick}
                            filtering={{
                                enabled: true,
                                column: 'name',
                                placeholder: t('searchPlaceholder')
                            }}
                            pagination={{
                                enabled: true,
                                pageSize: 10,
                                showPageSize: true,
                                showPageNumber: true
                            }}
                        />
                    </div>
                    
                </div>
            )}
            
            {/* <AddAlertRule 
                open={showAddModal}
                onOpenChange={setShowAddModal}
                onSuccess={() => {
                    setShowAddModal(false)
                    refetch()
                }}
            /> */}
        </>
    )
}