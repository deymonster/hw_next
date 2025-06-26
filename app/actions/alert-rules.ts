'use server'

import { services } from '@/services'
import { CreateAlertRuleRequest, UpdateAlertRuleRequest } from '@/services/prometheus/alerting/alert-rules.config.types'
import { AlertRule } from '@prisma/client'
import { auth } from '@/auth'

/**
 * Создание нового правила
 */
export async function createAlertRule(data: CreateAlertRuleRequest): Promise<{
    success: boolean
    alertRule?: AlertRule
    error?: string
}> {
    try {
        console.log('[CREATE_ALERT_RULE] Creating alert rule:', data.name)
        const session = await auth()
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'User not authenticated'
            }
        }
        const alertRule = await services.alertRulesManager.createRule(data, session.user.id)
        
        console.log('[CREATE_ALERT_RULE] Alert rule created successfully:', alertRule.id)
        
        return {
            success: true,
            alertRule
        }
    } catch (error) {
        console.error('[CREATE_ALERT_RULE] Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create alert rule'
        }
    }
}

/**
 * Получение всех правил пользователя
 */
export async function getAlertRules(): Promise<{
    success: boolean
    alertRules?: AlertRule[]
    error?: string
}> {
    try {
        console.log('[GET_ALERT_RULES] Fetching alert rules')
        const session = await auth()
        if (!session?.user?.id) {
            throw new Error('Unauthorized')
        }
        const alertRules = await services.alertRulesManager['alertRulesService'].getUserRules(session.user.id)
        return {
            success: true,
            alertRules
        }
    } catch (error) {
        console.error('[GET_ALERT_RULES] Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch alert rules'
        }
    }
}

/**
 * Получение правила по ID
 */
export async function getAlertRuleById(id: string): Promise<{
    success: boolean
    alertRule?: AlertRule
    error?: string
}> {
    try {
        console.log('[GET_ALERT_RULE] Fetching alert rule:', id)
        
        const alertRule = await services.alertRulesManager['alertRulesService'].findById(id)

        if (!alertRule) {
            return {
                success: false,
                error: 'Alert rule not found'
            }
        }
        return {
            success: true,
            alertRule
        }
    } catch (error) {
        console.error('[GET_ALERT_RULE] Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch alert rule'
        }
    }
}

/**
 * Обновление существующего правила
 */
export async function updateAlertRule(id: string, data: UpdateAlertRuleRequest): Promise<{
    success: boolean
    alertRule?: AlertRule
    error?: string
}> {
    try {
        console.log('[UPDATE_ALERT_RULE] Updating alert rule:', id)
        const existingRule = await getAlertRuleById(id)
        if (!existingRule.success) {
            return {
                success: false,
                error: existingRule.error || 'Правило не найдено'
            }
        }
        const alertRule = await services.alertRulesManager.updateRule(id, data)
        
        console.log('[UPDATE_ALERT_RULE] Alert rule updated successfully')
        
        return {
            success: true,
            alertRule
        }
    } catch (error) {
        console.error('[UPDATE_ALERT_RULE] Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update alert rule'
        }
    }
}


/**
 * Удаление правила
 */
export async function deleteAlertRule(id: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        console.log('[DELETE_ALERT_RULE] Deleting alert rule:', id)
        const existingRule = await getAlertRuleById(id)
        if (!existingRule.success) {
            return {
                success: false,
                error: existingRule.error || 'Правило не найдено'
            }
        }
        await services.alertRulesManager.deleteRule(id)
        
        console.log('[DELETE_ALERT_RULE] Alert rule deleted successfully')
        
        return {
            success: true
        }
    } catch (error) {
        console.error('[DELETE_ALERT_RULE] Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete alert rule'
        }
    }
}


/**
 * Переключение статуса правила
 */
export async function toggleAlertRule(id: string): Promise<{
    success: boolean
    alertRule?: AlertRule
    error?: string
}> {
    try {
        console.log('[TOGGLE_ALERT_RULE] Toggling alert rule:', id)
        const existingRule = await getAlertRuleById(id)
        if (!existingRule.success) {
            return {
                success: false,
                error: existingRule.error || 'Правило не найдено'
            }
        }
        const alertRule = await services.alertRulesManager.toggleRule(id)
        
        console.log('[TOGGLE_ALERT_RULE] Alert rule toggled successfully')
        
        return {
            success: true,
            alertRule
        }
    } catch (error) {
        console.error('[TOGGLE_ALERT_RULE] Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle alert rule'
        }
    }
}

/**
 * Экспорт правил в YAML
 */
export async function exportAlertRulesToYaml(): Promise<{
    success: boolean
    yaml?: string
    error?: string
}> {
    try {
        console.log('[EXPORT_ALERT_RULES] Exporting to YAML')
        
        const yaml = await services.alertRulesManager.exportActiveRules()
        
        console.log('[EXPORT_ALERT_RULES] Export successful')
        
        return {
            success: true,
            yaml
        }
    } catch (error) {
        console.error('[EXPORT_ALERT_RULES] Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to export alert rules'
        }
    }
}


/**
 * Импорт правил из YAML
 */
export async function importAlertRulesFromYaml(yamlContent: string): Promise<{
    success: boolean
    imported?: number
    error?: string
}> {
    try {
        console.log('[IMPORT_ALERT_RULES] Importing from YAML')
        const session = await auth()
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'User not authenticated'
            }
        }

        const importedRules = await services.alertRulesManager.importRules(yamlContent, session.user.id)
        
        console.log('[IMPORT_ALERT_RULES] Import successful, imported:', importedRules)
        
        return {
            success: true,
            imported: importedRules.length
        }
    } catch (error) {
        console.error('[IMPORT_ALERT_RULES] Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to import alert rules'
        }
    }
}

/**
 * Получение статистики правил
 */
export async function getAlertRulesStats(): Promise<{
    success: boolean
    stats?: any
    error?: string
}> {
    try {
        console.log('[GET_ALERT_RULES_STATS] Fetching stats')
        const session = await auth()
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'User not authenticated'
            }
        }

        const stats = await services.alertRulesManager.getExtendedStats(session.user.id)
        
        return {
            success: true,
            stats
        }
    } catch (error) {
        console.error('[GET_ALERT_RULES_STATS] Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch alert rules stats'
        }
    }
}
