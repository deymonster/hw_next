'use client'

import { AlertRule } from '@prisma/client'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { AddAlertRule } from '../add/AddAlertRule'
import { AlertRuleDetail } from '../detail/AlertRuleDetail'
import { createAlertRulesColumns } from './AlertRulesColumns'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/elements/DataTable'
import { useAlertRules } from '@/hooks/useAlertRules'

export function AlertRulesTable() {
	const t = useTranslations('dashboard.monitoring.alertRules')
	const { alertRules, isLoading, error, refetch } = useAlertRules()
	const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
	const columns = useMemo(
		() => createAlertRulesColumns((key: string) => t(key)),
		[t]
	)

	const selectedRule = useMemo(() => {
		if (!selectedRuleId || !alertRules) return null
		return alertRules.find(rule => rule.id === selectedRuleId) || null
	}, [selectedRuleId, alertRules])

	if (isLoading) {
		return (
			<div className='flex items-center justify-center p-4 text-sm'>
				Загрузка правил...
			</div>
		)
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
			<div className='flex flex-col items-center justify-center p-4 text-red-500'>
				<p className='text-sm'>Ошибка загрузки правил</p>
				<Button onClick={() => refetch()} className='mt-2 text-xs'>
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
						variant='ghost'
						onClick={() => setSelectedRuleId(null)}
						className='mb-4 h-8 text-xs'
					>
						<ArrowLeft className='mr-1 h-4 w-3' />
						{t('backToList')}
					</Button>
					{/* <AlertRuleDetail rule={selectedRule} onUpdate={refetch} /> */}
					<AlertRuleDetail
						rule={selectedRule}
						onBack={() => setSelectedRuleId(null)}
					/>
				</div>
			) : (
				<div>
					<div className='mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center'>
						<div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row'>
							<AddAlertRule />
							<Button
								variant='outline'
								onClick={handleSyncWithPrometheus}
								className='h-8 w-full text-xs sm:w-auto'
							>
								<RefreshCw className='mr-1 h-3 w-3' />
								<span className='hidden sm:inline'>
									{t('syncWithPrometheus')}
								</span>
								<span className='sm:hidden'>Синхронизация</span>
							</Button>
						</div>
					</div>

					{/* Добавляем счетчик правил */}
					<div className='text-xs text-muted-foreground'>
						{t('totalRules')}: {alertRules?.length || 0}
					</div>

					<div className='overflow-x-auto'>
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
