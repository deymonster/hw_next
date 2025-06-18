import { AlertRulesService } from './alert-rules.service';
import { AlertRulesConfigService } from './alert-rules.config.service';
import { AlertRule } from '@prisma/client';
import { 
  IAlertRuleCreateInput, 
  AlertCategory, 
  AlertSeverity, 
  ComparisonOperator, 
  ChangeType
} from './alert-rules.types';
import { 
  AlertRuleConfig, 
  CreateAlertRuleRequest, 
  UpdateAlertRuleRequest 
} from './alert-rules.config.types';

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
   * Создать правило с валидацией и синхронизацией с Prometheus
   */
  async createRule(request: CreateAlertRuleRequest, userId: string): Promise<AlertRule | AlertRule[]> {
    // 1. Валидация через конфигурационный сервис
    const validation = await this.configService.validateRule(request);
    if (!validation.isValid) {
      throw new Error(`Ошибки валидации: ${validation.errors.join(', ')}`);
    }

    // 2. Генерация PromQL выражения если нужно
    const expressions = request.expression || this.configService.generateExpression(
      request.metric,
      request.category,
      request.changeType,
      request.threshold,
      request.operator
    );
    // Для категории HARDWARE_CHANGE всегда используем метрику Hardware_Change_Detected
    if (request.category === AlertCategory.HARDWARE_CHANGE) {
      // 3. Подготовка данных для БД
      const dbData: IAlertRuleCreateInput = {
        name: request.name,
        category: request.category,
        metric: 'Hardware_Change_Detected',
        expression: expressions as string, // Для HARDWARE_CHANGE всегда возвращается строка
        threshold: request.threshold,
        operator: request.operator,
        duration: request.duration,
        severity: request.severity,
        description: request.description,
        labels: request.labels,
        enabled: request.enabled ?? true,
        user: {
          connect: { id: userId }
        }
      };

      // 4. Сохранение в БД
      const rule = await this.alertRulesService.createRule(dbData);
      
      // 5. Синхронизация с Prometheus
      await this.syncWithPrometheus();

      return rule;
    }
    // Если выражение - массив (для других категорий с несколькими метриками)
    else if (Array.isArray(expressions)) {
      const rules: AlertRule[] = [];
      const hardwareMetrics = this.configService.getHardwareMetrics();

      // Создаем отдельное правило для каждого выражения
      for (let i = 0; i < expressions.length; i++) {
        const expression = expressions[i];
        const metricName = hardwareMetrics[i];
        
        // 3. Подготовка данных для БД
        const dbData: IAlertRuleCreateInput = {
          name: `${request.name} (${metricName})`,
          category: request.category,
          metric: metricName,
          expression,
          threshold: request.threshold,
          operator: request.operator,
          duration: request.duration,
          severity: request.severity,
          description: request.description,
          labels: request.labels,
          enabled: request.enabled ?? true,
          user: {
            connect: { id: userId }
          }
        };

        // 4. Сохранение в БД
        const rule = await this.alertRulesService.createRule(dbData);
        rules.push(rule);
      }

      // 5. Синхронизация с Prometheus
      await this.syncWithPrometheus();

      return rules;
    } else {
      // Стандартная логика для одного правила
      // 3. Подготовка данных для БД
      const dbData: IAlertRuleCreateInput = {
        name: request.name,
        category: request.category,
        metric: request.metric,
        expression: expressions,
        threshold: request.threshold,
        operator: request.operator,
        duration: request.duration,
        severity: request.severity,
        description: request.description,
        labels: request.labels,
        enabled: request.enabled ?? true,
        user: {
          connect: { id: userId }
        }
      };

      // 4. Сохранение в БД
      const rule = await this.alertRulesService.createRule(dbData);

      // 5. Синхронизация с Prometheus
      await this.syncWithPrometheus();

      return rule;
    }

  }

  /**
   * Обновить правило
   */
  async updateRule(id: string, request: UpdateAlertRuleRequest): Promise<AlertRule> {
    // 1. Валидация
    const validation = await this.configService.validateRule(request);
    if (!validation.isValid) {
      throw new Error(`Ошибки валидации: ${validation.errors.join(', ')}`);
    }

    // 2. Обновление в БД
    const updateData: Partial<IAlertRuleCreateInput> = { ...request };
    
    // Генерация нового выражения если изменились параметры
    if (request.threshold !== undefined || request.operator !== undefined) {
      const currentRule = await this.alertRulesService.findById(id);
      if (currentRule) {
        const expression = this.configService.generateExpression(
          currentRule.metric,
          currentRule.category as AlertCategory,
          currentRule.changeType as ChangeType,
          request.threshold ?? (currentRule.threshold ?? undefined),
          request.operator ?? (currentRule.operator as ComparisonOperator)
        );
        updateData.expression = Array.isArray(expression) ? expression[0] : expression;
      }
    }

    const rule = await this.alertRulesService.update(id, updateData);

    // 3. Синхронизация с Prometheus
    await this.syncWithPrometheus();

    return rule;
  }

  /**
   * Удалить правило
   */
  async deleteRule(id: string): Promise<void> {
    await this.alertRulesService.delete(id);
    await this.syncWithPrometheus();
  }

  /**
   * Переключить статус правила
   */
  async toggleRule(id: string): Promise<AlertRule> {
    const rule = await this.alertRulesService.toggleRule(id);
    await this.syncWithPrometheus();
    return rule;
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
        console.error(`Ошибка импорта правила ${config.name}:`, error);
      }
    }

    return results;
  }

  /**
   * Синхронизировать все правила с Prometheus
   */
  async syncWithPrometheus(): Promise<boolean> {
    try {
      // 1. Получить все активные правила
      const rules = await this.alertRulesService.getActiveRules();
      
      // 2. Конвертировать в конфигурацию
      const configs = rules.map(rule => this.convertDbRuleToConfig(rule));
      
      // 3. Сохранить в файл
      await this.configService.saveRulesToFile(configs, 'generated.rules.yml');
      
      // 4. Перезагрузить Prometheus
      return await this.configService.reloadPrometheus();
    } catch (error) {
      console.error('Ошибка синхронизации с Prometheus:', error);
      return false;
    }
  }

  /**
   * Получить статистику с дополнительной информацией
   */
  async getExtendedStats(userId?: string) {
    const stats = await this.alertRulesService.getRulesStats(userId);
    
    return {
      ...stats,
      lastSync: new Date(), // В реальности нужно хранить время последней синхронизации
      prometheusStatus: await this.checkPrometheusStatus()
    };
  }

  // Приватные методы
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

  private async checkPrometheusStatus(): Promise<boolean> {
    try {
      // Простая проверка доступности Prometheus
      return true; // В реальности нужно делать запрос к Prometheus API
    } catch {
      return false;
    }
  }
}