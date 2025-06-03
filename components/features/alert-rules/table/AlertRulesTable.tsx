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
        return <div className="flex items-center justify-center p-4">Загрузка правил...</div>
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
                <p>Ошибка загрузки правил</p>
                <Button onClick={() => refetch()} className="mt-2">
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
                        className="mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('backToList')}
                    </Button>
                    {/* <AlertRuleDetail rule={selectedRule} onUpdate={refetch} /> */}
                </div>
            ) : (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-2">
                            <Button onClick={() => setShowAddModal(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('addRule')}
                            </Button>
                            <Button variant="outline" onClick={handleSyncWithPrometheus}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {t('syncWithPrometheus')}
                            </Button>
                        </div>
                    </div>
                    
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