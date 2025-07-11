'use client'

import { $Enums, AlertRule } from '@prisma/client'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, Edit, Trash } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

import { AddAlertRuleModal } from '../add/forms/AddModal'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/elements/ConfirmModal'
import { Switch } from '@/components/ui/switch'
import { useAlertRules } from '@/hooks/useAlertRules'
import { AlertCategory } from '@/services/prometheus/alerting/alert-rules.types'

interface AlertRuleDetailProps {
	rule: AlertRule
	onBack: () => void
}

interface AlertRulesQueryData {
	alertRules: AlertRule[]
	success: boolean
	error?: string
	alertRule?: AlertRule
}

export function AlertRuleDetail({ rule, onBack }: AlertRuleDetailProps) {
	const t = useTranslations('dashboard.monitoring.alertRules')
	const { deleteRule, toggleRule } = useAlertRules()
	const [isDeleting, setIsDeleting] = useState(false)
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
	const queryClient = useQueryClient()

	// Обработчик удаления правила
	const handleDelete = async () => {
		try {
			setIsDeleting(true)
			// Оптимистичное обновление UI
			queryClient.setQueryData(
				['alert-rules', 'all'],
				(old: AlertRulesQueryData | undefined) => {
					if (old?.alertRules) {
						return {
							...old,
							alertRules: old.alertRules.filter(
								(r: AlertRule) => r.id !== rule.id
							)
						}
					}
					return old
				}
			)

			await deleteRule(rule.id)
			toast.success(t('deleteSuccess'))
			onBack()
		} catch (error) {
			console.error(error)
			queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
			toast.error(t('deleteError'))
		} finally {
			setIsDeleting(false)
		}
	}

	// Обработчик переключения статуса правила
	const handleToggle = async () => {
		try {
			await toggleRule(rule.id)
			toast.success(
				rule.enabled ? t('disableSuccess') : t('enableSuccess')
			)
		} catch (error) {
			console.error(error)
			toast.error(t('toggleError'))
		}
	}

	// Получение названия категории
	const getCategoryName = (category: $Enums.AlertCategory) => {
		return t(`categories.${category.toLowerCase()}`)
	}

	// Получение названия подкатегории (для CPU, DISK, NETWORK)
	const getSubcategoryName = () => {
		if (rule.category === AlertCategory.CPU_MONITORING) {
			return t(`subcategories.cpu.${rule.metric}`)
		} else if (rule.category === AlertCategory.DISK_MONITORING) {
			return t(`subcategories.disk.${rule.metric}`)
		} else if (rule.category === AlertCategory.NETWORK_MONITORING) {
			return t(`subcategories.network.${rule.metric}`)
		}
		return rule.metric
	}

	// Получение названия оператора сравнения
	const getOperatorName = (operator?: $Enums.ComparisonOperator | null) => {
		if (!operator) return ''
		return t(`operators.${operator.toLowerCase()}`)
	}

	// Получение названия уровня важности
	const getSeverityName = (severity: $Enums.AlertSeverity) => {
		return t(`severities.${severity.toLowerCase()}`)
	}

	return (
		<div className='mt-6 space-y-6'>
			<div className='flex items-center justify-between'>
				<div>
					<h2 className='text-2xl font-bold'>{rule.name}</h2>
					<p className='text-sm text-muted-foreground'>
						{rule.description}
					</p>
				</div>

				<div className='flex items-center space-x-2'>
					<Button
						variant='outline'
						size='icon'
						onClick={() => setIsDuplicateModalOpen(true)}
						title={t('duplicate')}
					>
						<Copy className='h-4 w-4' />
					</Button>

					<Button
						variant='outline'
						size='icon'
						onClick={() => setIsEditModalOpen(true)}
						title={t('edit')}
					>
						<Edit className='h-4 w-4' />
					</Button>

					<ConfirmModal
						heading={t('modal.delete.confirmTitle')}
						message={t('modal.delete.confirmMessage', {
							name: rule.name
						})}
						onConfirm={handleDelete}
					>
						<Button
							variant='destructive'
							size='icon'
							disabled={isDeleting}
							title={t('delete')}
						>
							<Trash className='h-4 w-4' />
						</Button>
					</ConfirmModal>
				</div>
			</div>

			<Card>
				<CardContent className='pt-6'>
					<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
						<div className='rounded-lg bg-secondary/20 p-4'>
							<div className='mb-2 flex items-center justify-between'>
								<h3 className='font-medium'>
									{t('detail.status')}
								</h3>
								<Switch
									checked={rule.enabled}
									onCheckedChange={handleToggle}
								/>
							</div>
							<p className='text-sm text-muted-foreground'>
								{rule.enabled
									? t('detail.enabled')
									: t('detail.disabled')}
							</p>
						</div>

						<div className='rounded-lg bg-secondary/20 p-4'>
							<h3 className='mb-2 font-medium'>
								{t('detail.category')}
							</h3>
							<p className='text-sm text-muted-foreground'>
								{getCategoryName(rule.category)}
							</p>
						</div>

						{(rule.category === AlertCategory.CPU_MONITORING ||
							rule.category === AlertCategory.DISK_MONITORING ||
							rule.category ===
								AlertCategory.NETWORK_MONITORING) && (
							<div className='rounded-lg bg-secondary/20 p-4'>
								<h3 className='mb-2 font-medium'>
									{t('detail.subcategory')}
								</h3>
								<p className='text-sm text-muted-foreground'>
									{getSubcategoryName()}
								</p>
							</div>
						)}

						{rule.threshold !== null && rule.operator && (
							<div className='rounded-lg bg-secondary/20 p-4'>
								<h3 className='mb-2 font-medium'>
									{t('detail.triggerCondition')}
								</h3>
								<p className='text-sm text-muted-foreground'>
									{getOperatorName(rule.operator)}{' '}
									{rule.threshold}
								</p>
							</div>
						)}

						<div className='rounded-lg bg-secondary/20 p-4'>
							<h3 className='mb-2 font-medium'>
								{t('detail.duration')}
							</h3>
							<p className='text-sm text-muted-foreground'>
								{rule.duration}
							</p>
						</div>

						<div className='rounded-lg bg-secondary/20 p-4'>
							<h3 className='mb-2 font-medium'>
								{t('detail.severity')}
							</h3>
							<p className='text-sm text-muted-foreground'>
								{getSeverityName(rule.severity)}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Модальное окно редактирования */}
			<AddAlertRuleModal
				isOpen={isEditModalOpen}
				onClose={() => setIsEditModalOpen(false)}
				editMode={true}
				ruleToEdit={rule}
			/>

			{/* Модальное окно дублирования */}
			<AddAlertRuleModal
				isOpen={isDuplicateModalOpen}
				onClose={() => setIsDuplicateModalOpen(false)}
				duplicateMode={true}
				ruleToEdit={rule}
			/>
		</div>
	)
}
