import { AlertRulesService } from './alert-rules.service';
import { AlertRulesConfigService } from './alert-rules.config.service';
import { AlertRule } from '@prisma/client';
import { 
  IAlertRuleCreateInput, 
  AlertCategory, 
  AlertSeverity, 
  ComparisonOperator
} from './alert-rules.types';
import { 
  AlertRuleConfig, 
  CreateAlertRuleRequest, 
  UpdateAlertRuleRequest 
} from './alert-rules.config.types';

// Кастомные ошибки
class ValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Ошибки валидации: ${errors.join(', ')}`);
    this.name = 'ValidationError';
  }
}

class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncError';
  }
}

/**
 * Менеджер правил оповещений - объединяет работу с БД и конфигурацией Prometheus
 * Это основной сервис для работы с правилами на уровне бизнес-логики
 */
export class AlertRulesManagerService {
  constructor(
    private readonly alertRulesService: AlertRulesService,
    private readonly configService: AlertRulesConfigService
  ) {}

  /**
   * Создает новое правило алерта с полной валидацией и синхронизацией
   * 
   * @param request - Данные для создания правила
   * @param userId - ID пользователя, создающего правило
   * @returns Созданное правило 
   * @throws {ValidationError} Если валидация не пройдена
   * @throws {SyncError} Если не удалось синхронизировать с Prometheus
   */
  async createRule(request: CreateAlertRuleRequest, userId: string): Promise<AlertRule> {
    
    // Валидация данных
    const validation = await this.configService.validateRule(request);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }
    
    const rule = request.category === AlertCategory.HARDWARE_CHANGE
      ? await this.createHardwareChangeRule(request, userId)
      : await this.createMonitoringRule(request, userId);
    
    await this.syncWithPrometheus('Failed to sync after rule creation');
    
    return rule;
    
  }

  /**
   * Обновляет существующее правило алерта
   * 
   * @param id - ID правила для обновления
   * @param request - Данные для обновления
   * @returns Обновленное правило
   * @throws {ValidationError} Если валидация не пройдена
   * @throws {SyncError} Если не удалось синхронизировать с Prometheus
   */
  async updateRule(id: string, request: UpdateAlertRuleRequest): Promise<AlertRule> {
    const validation = await this.configService.validateRule(request);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }
    
    const rule = await this.updateRuleInDatabase(id, request);
    await this.syncWithPrometheus('Failed to sync after rule update');
    
    return rule;
  }

  /**
   * Удаляет правило алерта
   * 
   * @param id - ID правила для удаления
   * @throws {SyncError} Если не удалось синхронизировать с Prometheus
   */
  async deleteRule(id: string): Promise<void> {
    await this.alertRulesService.delete(id);
    await this.syncWithPrometheus('Failed to sync after rule deletion');
  }

  /**
   * Переключает статус правила (включено/выключено)
   * @param id - ID правила для переключения
   * @returns - Обновленное правило
   * @throws {SyncError} Если не удалось синхронизировать с Prometheus
   */
  async toggleRule(id: string): Promise<AlertRule> {
    const rule = await this.alertRulesService.toggleRule(id);
    await this.syncWithPrometheus('Failed to sync after rule toggle');
    return rule;
  }




  // ==================== Приватные методы Приватные методы для создания правил ====================
  

  

  /**
   * Создает правило для изменения оборудования
   */
  private async createHardwareChangeRule(
    request: CreateAlertRuleRequest,
    userId: string
  ): Promise<AlertRule> {
    const dbData = {
      name: request.name,
      category: AlertCategory.HARDWARE_CHANGE,
      metric: 'Hardware_Change_Detected',
      expression: 'Hardware_Change_Detected == 1',
      duration: request.duration || '0s',
      severity: request.severity,
      description: request.description,
      labels: request.labels,
      enabled: request.enabled ?? true,
      user: { connect: { id: userId } },
    };
    
    return this.alertRulesService.createRule(dbData);
  }

  /**
   * Создает обычное правило мониторинга
   */
  private async createMonitoringRule(
    request: CreateAlertRuleRequest,
    userId: string
  ): Promise<AlertRule> {
    if (request.threshold === undefined || !request.operator || !request.metric) {
      throw new ValidationError(['Для правил мониторинга обязательны threshold, operator и metric']);
    }

    const expression = this.generateExpression(
      request.metric,
      request.operator,
      request.threshold
    );

    const dbData: IAlertRuleCreateInput = {
      name: request.name,
      category: request.category,
      metric: request.metric,
      expression,
      threshold: request.threshold,
      operator: request.operator,
      duration: request.duration,
      severity: request.severity,
      description: request.description,
      labels: request.labels,
      enabled: request.enabled ?? true,
      user: { connect: { id: userId } },
    };

    return this.alertRulesService.createRule(dbData);
  }

  // ==================== Приватные методы для обновления правил ====================
  private async updateRuleInDatabase(
    id: string,
    request: UpdateAlertRuleRequest
  ): Promise<AlertRule> {
    const updateData: Partial<UpdateAlertRuleRequest> = { ...request };

    if (request.threshold !== undefined || request.operator !== undefined || request.metric !== undefined) {
      const currentRule = await this.alertRulesService.findById(id);
      if (!currentRule) {
        throw new Error(`Rule with ID ${id} not found`);
      }

      const metric = request.metric ?? currentRule.metric;
      const operator = request.operator ?? currentRule.operator;
      const threshold = request.threshold ?? currentRule.threshold;

      if (threshold !== null && operator !== null) {
          updateData.expression = this.generateExpression(
          metric, 
          operator as ComparisonOperator, 
          threshold
        );
      }
    }

    return this.alertRulesService.update(id, updateData);
  }

  // ==================== Генерация и конвертация ====================

  /**
   * Генерирует выражение для сравнения
   */
  private generateExpression(
    metric: string,
    operator: ComparisonOperator,
    threshold: number
  ): string {
    const operatorSymbol = this.configService.convertOperatorToPromQL(operator);
    return `${metric} ${operatorSymbol} ${threshold}`;
  }

  /**
   * Экспортировать все активные правила в YAML
   */
  async exportActiveRules(): Promise<string> {
    const rules = await this.alertRulesService.getActiveRules();
    const configs = rules.map(rule => this.convertDbRuleToConfig(rule));
    return this.configService.exportToYaml(configs);
  }

  /**
   * Импортировать правила из YAML
   */
  async importRules(yamlContent: string, userId: string): Promise<AlertRule[]> {
    const configs = await this.configService.importFromYaml(yamlContent);
    const results: AlertRule[] = [];
    const errors: {name: string, error: string}[] = [];

    for (const config of configs) {
      try {
        const request = this.convertConfigToCreateRequest(config);
        const rule = await this.createRule(request, userId);
        if (Array.isArray(rule)) {
          results.push(...rule);
        } else {
          results.push(rule);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({name: config.name, error: errorMessage});
        console.error(`Ошибка импорта правила ${config.name}:`, error);
      }
    }
    if (errors.length > 0) {
      console.warn(`Импортировано ${results.length} правил, ${errors.length} с ошибками`);
    }

    return results;
  }
   
  
  /**
   * Синхронизировать все правила с Prometheus
   * @throws {SyncError} если синхронизация не удалась
   */
  async syncWithPrometheus(errorMessage: string): Promise<void> {
    try {
      // 1. Получить все активные правила
      const rules = await this.alertRulesService.getActiveRules();
      
      // 2. Конвертировать в конфигурацию
      const configs = rules.map(rule => this.convertDbRuleToConfig(rule));
      
      // 3. Сохранить в файл
      await this.configService.saveRulesToFile(configs, 'generated.rules.yml');
      
      // 4. Перезагрузить Prometheus
      const success = await this.configService.reloadPrometheus();
      if (!success) {
        throw new SyncError('Перезагрузка Prometheus API вернула ошибку');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Ошибка синхронизации с Prometheus:', message);
      throw new SyncError(errorMessage);
    }
  }

  

  // ==================== Приватные методы конвертации ====================

  
  private convertDbRuleToConfig(rule: AlertRule): AlertRuleConfig {
    return {
      id: rule.id,
      name: rule.name,
      category: rule.category as AlertCategory,
      metric: rule.metric,
      expression: rule.expression,
      threshold: rule.threshold ?? undefined,
      operator: rule.operator as ComparisonOperator,
      duration: rule.duration,
      severity: rule.severity as AlertSeverity,
      description: rule.description,
      labels: rule.labels as Record<string, string> || {},
      enabled: rule.enabled,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    };
  }

  private convertConfigToCreateRequest(config: AlertRuleConfig): CreateAlertRuleRequest {
    return {
      name: config.name,
      category: config.category,
      metric: config.metric,
      threshold: config.threshold,
      operator: config.operator,
      duration: config.duration,
      severity: config.severity,
      description: config.description,
      labels: config.labels,
      enabled: config.enabled
    };
  }
}
