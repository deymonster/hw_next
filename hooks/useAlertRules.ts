'use client'

import { AlertRule } from '@prisma/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
	createAlertRule,
	deleteAlertRule,
	exportAlertRulesToYaml,
	getAlertRuleById,
	getAlertRules,
	importAlertRulesFromYaml,
	toggleAlertRule,
	updateAlertRule
} from '@/app/actions/alert-rules'
import {
	CreateAlertRuleRequest,
	UpdateAlertRuleRequest
} from '@/services/prometheus/alerting/alert-rules.config.types'

/**
 * Ключ для кэширования запросов правил алертов
 */
export const ALERT_RULES_QUERY_KEY = ['alert-rules'] as const

interface UseAlertRulesOptions {
	onSuccess?: () => void
	onError?: (error: Error) => void
}

interface UseAlertRulesReturn {
	// Данные
	alertRules: AlertRule[]
	isLoading: boolean
	error: Error | null

	// Мутации
	createRule: (data: CreateAlertRuleRequest) => Promise<AlertRule>
	updateRule: (id: string, data: UpdateAlertRuleRequest) => Promise<AlertRule>
	deleteRule: (id: string) => void
	deleteRuleAsync: (id: string) => Promise<any>
	toggleRule: (id: string) => Promise<AlertRule>
	getRule: (id: string) => Promise<any>

	// Импорт/экспорт
	exportToYaml: () => Promise<string>
	importFromYaml: (yamlContent: string) => Promise<number>

	// Состояния загрузки
	isCreating: boolean
	isUpdating: boolean
	isDeleting: boolean
	isToggling: boolean
	isExporting: boolean
	isImporting: boolean

	// Ошибки
	createError: Error | null
	updateError: Error | null
	deleteError: Error | null
	toggleError: Error | null
	exportError: Error | null
	importError: Error | null

	// Утилиты
	refetch: () => void
	clearError: () => void
}

export function useAlertRules(
	options?: UseAlertRulesOptions
): UseAlertRulesReturn {
	const queryClient = useQueryClient()

	/**
	 * Запрос всех правил алертов
	 */
	const {
		data: alertRulesResponse,
		isLoading,
		error
	} = useQuery({
		queryKey: [...ALERT_RULES_QUERY_KEY, 'all'],
		queryFn: async () => {
			console.log('[CLIENT] useAlertRules - Fetching alert rules...')
			const result = await getAlertRules()
			console.log(
				'[CLIENT] useAlertRules - Alert rules fetched:',
				result.alertRules?.length || 0
			)
			return result
		},
		select: data => {
			if (data.success && data.alertRules) {
				return {
					success: true,
					alertRules: data.alertRules
				}
			}
			return { success: false, alertRules: [] }
		}
	})

	/**
	 * Мутация для создания правила алерта
	 */
	const createMutation = useMutation({
		mutationFn: (data: CreateAlertRuleRequest) => {
			console.log(
				'[CLIENT] useAlertRules - Creating alert rule:',
				data.name
			)
			return createAlertRule(data)
		},
		onSuccess: result => {
			if (result.success && result.alertRule) {
				// Инвалидируем кэш после успешного создания
				queryClient.invalidateQueries({
					queryKey: ALERT_RULES_QUERY_KEY
				})
				options?.onSuccess?.()
				console.log(
					'[CLIENT] useAlertRules - Alert rule created successfully'
				)
			}
		},
		onError: error => {
			console.error(
				'[CLIENT] useAlertRules - Error creating alert rule:',
				error
			)
			options?.onError?.(error as Error)
		}
	})

	/**
	 * Мутация для обновления правила алерта
	 */
	const updateMutation = useMutation({
		mutationFn: ({
			id,
			data
		}: {
			id: string
			data: UpdateAlertRuleRequest
		}) => {
			console.log('[CLIENT] useAlertRules - Updating alert rule:', id)
			return updateAlertRule(id, data)
		},
		onSuccess: result => {
			if (result.success && result.alertRule) {
				// Инвалидируем кэш после успешного обновления
				queryClient.invalidateQueries({
					queryKey: ALERT_RULES_QUERY_KEY
				})
				// Обновляем кэш конкретного правила
				queryClient.setQueryData(
					[...ALERT_RULES_QUERY_KEY, 'details', result.alertRule.id],
					result
				)
				options?.onSuccess?.()
				console.log(
					'[CLIENT] useAlertRules - Alert rule updated successfully'
				)
			}
		},
		onError: error => {
			console.error(
				'[CLIENT] useAlertRules - Error updating alert rule:',
				error
			)
			options?.onError?.(error as Error)
		}
	})

	/**
	 * Мутация для удаления правила алерта
	 */
	const deleteMutation = useMutation({
		mutationFn: (id: string) => {
			console.log('[CLIENT] useAlertRules - Deleting alert rule:', id)
			return deleteAlertRule(id)
		},
		onSuccess: (_, deletedId) => {
			// Инвалидируем общий кэш правил алертов
			queryClient.invalidateQueries({ queryKey: ALERT_RULES_QUERY_KEY })

			// Удаляем кэш конкретного правила
			queryClient.removeQueries({
				queryKey: [...ALERT_RULES_QUERY_KEY, 'details', deletedId]
			})

			options?.onSuccess?.()
			console.log(
				'[CLIENT] useAlertRules - Alert rule deleted successfully'
			)
		},
		onError: error => {
			console.error(
				'[CLIENT] useAlertRules - Error deleting alert rule:',
				error
			)
			options?.onError?.(error as Error)
		}
	})

	/**
	 * Мутация для переключения состояния правила алерта
	 */
	const toggleMutation = useMutation({
		mutationFn: (id: string) => {
			console.log('[CLIENT] useAlertRules - Toggling alert rule:', id)
			return toggleAlertRule(id)
		},
		onSuccess: result => {
			if (result.success && result.alertRule) {
				// Инвалидируем кэш после успешного переключения
				queryClient.invalidateQueries({
					queryKey: ALERT_RULES_QUERY_KEY
				})
				// Обновляем кэш конкретного правила
				queryClient.setQueryData(
					[...ALERT_RULES_QUERY_KEY, 'details', result.alertRule.id],
					result
				)
				options?.onSuccess?.()
				console.log(
					'[CLIENT] useAlertRules - Alert rule toggled successfully'
				)
			}
		},
		onError: error => {
			console.error(
				'[CLIENT] useAlertRules - Error toggling alert rule:',
				error
			)
			options?.onError?.(error as Error)
		}
	})

	/**
	 * Мутация для экспорта в YAML
	 */
	const exportMutation = useMutation({
		mutationFn: () => {
			console.log('[CLIENT] useAlertRules - Exporting to YAML')
			return exportAlertRulesToYaml()
		},
		onError: error => {
			console.error('[CLIENT] useAlertRules - Error exporting:', error)
			options?.onError?.(error as Error)
		}
	})

	/**
	 * Мутация для импорта из YAML
	 */
	const importMutation = useMutation({
		mutationFn: (yamlContent: string) => {
			console.log('[CLIENT] useAlertRules - Importing from YAML')
			return importAlertRulesFromYaml(yamlContent)
		},
		onSuccess: result => {
			if (result.success) {
				// Инвалидируем кэш после успешного импорта
				queryClient.invalidateQueries({
					queryKey: ALERT_RULES_QUERY_KEY
				})
				options?.onSuccess?.()
				console.log(
					'[CLIENT] useAlertRules - Import successful, imported:',
					result.imported
				)
			}
		},
		onError: error => {
			console.error('[CLIENT] useAlertRules - Error importing:', error)
			options?.onError?.(error as Error)
		}
	})

	/**
	 * Создание правила алерта с возвратом результата
	 */
	const createRuleWithResult = async (
		data: CreateAlertRuleRequest
	): Promise<AlertRule> => {
		return new Promise((resolve, reject) => {
			createMutation.mutate(data, {
				onSuccess: result => {
					if (result.success && result.alertRule) {
						resolve(result.alertRule)
					} else {
						reject(
							new Error(
								result.error ||
									'Не удалось создать правило алерта'
							)
						)
					}
				},
				onError: error => {
					reject(error)
				}
			})
		})
	}

	/**
	 * Обновление правила алерта с возвратом результата
	 */
	const updateRuleWithResult = async (
		id: string,
		data: UpdateAlertRuleRequest
	): Promise<AlertRule> => {
		return new Promise((resolve, reject) => {
			updateMutation.mutate(
				{ id, data },
				{
					onSuccess: result => {
						if (result.success && result.alertRule) {
							resolve(result.alertRule)
						} else {
							reject(
								new Error(
									result.error ||
										'Не удалось обновить правило алерта'
								)
							)
						}
					},
					onError: error => {
						reject(error)
					}
				}
			)
		})
	}

	/**
	 * Переключение состояния правила алерта с возвратом результата
	 */
	const toggleRuleWithResult = async (id: string): Promise<AlertRule> => {
		return new Promise((resolve, reject) => {
			toggleMutation.mutate(id, {
				onSuccess: result => {
					if (result.success && result.alertRule) {
						resolve(result.alertRule)
					} else {
						reject(
							new Error(
								result.error ||
									'Не удалось переключить правило алерта'
							)
						)
					}
				},
				onError: error => {
					reject(error)
				}
			})
		})
	}

	/**
	 * Асинхронное удаление правила алерта с возвратом результата
	 */
	const deleteRuleAsync = (id: string): Promise<any> => {
		return new Promise((resolve, reject) => {
			deleteMutation.mutate(id, {
				onSuccess: result => resolve(result),
				onError: error => reject(error)
			})
		})
	}

	/**
	 * Экспорт в YAML с возвратом результата
	 */
	const exportToYamlWithResult = async (): Promise<string> => {
		return new Promise((resolve, reject) => {
			exportMutation.mutate(undefined, {
				onSuccess: result => {
					if (result.success && result.yaml) {
						resolve(result.yaml)
					} else {
						reject(
							new Error(
								result.error ||
									'Не удалось экспортировать правила алертов'
							)
						)
					}
				},
				onError: error => {
					reject(error)
				}
			})
		})
	}

	/**
	 * Импорт из YAML с возвратом результата
	 */
	const importFromYamlWithResult = async (
		yamlContent: string
	): Promise<number> => {
		return new Promise((resolve, reject) => {
			importMutation.mutate(yamlContent, {
				onSuccess: result => {
					if (result.success && typeof result.imported === 'number') {
						resolve(result.imported)
					} else {
						reject(
							new Error(
								result.error ||
									'Не удалось импортировать правила алертов'
							)
						)
					}
				},
				onError: error => {
					reject(error)
				}
			})
		})
	}

	/**
	 * Получение конкретного правила алерта
	 */
	const getRule = async (id: string) => {
		console.log('[CLIENT] useAlertRules - Fetching alert rule:', id)
		try {
			const result = await getAlertRuleById(id)
			return result
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to fetch alert rule'
			console.error(
				'[CLIENT] useAlertRules - Error fetching alert rule:',
				message
			)
			options?.onError?.(error as Error)
			return null
		}
	}

	return {
		// Данные
		alertRules:
			(alertRulesResponse?.success && alertRulesResponse.alertRules) ||
			[],
		isLoading,
		error,

		// Мутации
		createRule: createRuleWithResult,
		updateRule: updateRuleWithResult,
		deleteRule: deleteMutation.mutate,
		deleteRuleAsync,
		toggleRule: toggleRuleWithResult,
		getRule,

		// Импорт/экспорт
		exportToYaml: exportToYamlWithResult,
		importFromYaml: importFromYamlWithResult,

		// Состояния загрузки
		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isDeleting: deleteMutation.isPending,
		isToggling: toggleMutation.isPending,
		isExporting: exportMutation.isPending,
		isImporting: importMutation.isPending,

		// Ошибки
		createError: createMutation.error,
		updateError: updateMutation.error,
		deleteError: deleteMutation.error,
		toggleError: toggleMutation.error,
		exportError: exportMutation.error,
		importError: importMutation.error,

		// Утилиты
		refetch: () =>
			queryClient.invalidateQueries({ queryKey: ALERT_RULES_QUERY_KEY }),
		clearError: () => {
			// Сбрасываем ошибки всех мутаций
			createMutation.reset()
			updateMutation.reset()
			deleteMutation.reset()
			toggleMutation.reset()
			exportMutation.reset()
			importMutation.reset()
		}
	}
}
