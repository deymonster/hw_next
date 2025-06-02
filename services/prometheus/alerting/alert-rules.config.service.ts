import { IAlertRulesConfigService } from './alert-rules.config.service.interface';
import { 
  AlertRuleConfig, 
  CreateAlertRuleRequest, 
  UpdateAlertRuleRequest, 
  AlertRuleValidationResult 
} from './alert-rules.config.types';
import { AlertCategory, AlertSeverity, ComparisonOperator } from './alert-rules.types';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Сервис для работы с конфигурационными файлами Prometheus
 * Отвечает за валидацию, экспорт/импорт YAML, генерацию PromQL
 */
export class AlertRulesConfigService implements IAlertRulesConfigService {
  private readonly prometheusUrl: string;
  private readonly rulesPath: string;

  constructor(config: { prometheusUrl: string; rulesPath: string }) {
    this.prometheusUrl = config.prometheusUrl;
    this.rulesPath = config.rulesPath;
  }

  /**
   * Валидировать правило перед созданием/обновлением
   */
  async validateRule(config: CreateAlertRuleRequest | UpdateAlertRuleRequest): Promise<AlertRuleValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Валидация обязательных полей для создания
    if ('name' in config) {
      if (!config.name?.trim()) {
        errors.push('Название правила обязательно');
      } else if (config.name.length > 100) {
        errors.push('Название правила не должно превышать 100 символов');
      }
    }

    if ('metric' in config) {
      if (!config.metric?.trim()) {
        errors.push('Метрика обязательна');
      } else if (!this.validateMetricName(config.metric)) {
        errors.push('Некорректное название метрики');
      }
    }

    // Валидация threshold и operator
    if (config.threshold !== undefined) {
      if (typeof config.threshold !== 'number' || config.threshold < 0) {
        errors.push('Пороговое значение должно быть положительным числом');
      }
    }

    // Валидация duration
    if (config.duration && !this.validateDuration(config.duration)) {
      errors.push('Некорректный формат длительности (например: 5m, 1h, 30s)');
    }

    // Валидация PromQL выражения если есть
    if (config.expression && typeof config.expression === 'string') {
        if (!this.validateExpression(config.expression)) {
        errors.push('Некорректное PromQL выражение');
        }
    }

    // Предупреждения
    if (config.threshold && config.threshold > 100) {
      warnings.push('Высокое пороговое значение может привести к частым срабатываниям');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Перезагрузить конфигурацию Prometheus
   */
  async reloadPrometheus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.prometheusUrl}/-/reload`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Ошибка перезагрузки Prometheus:', error);
      return false;
    }
  }

  /**
   * Экспортировать правила в YAML формат
   */
  async exportToYaml(rules: AlertRuleConfig[]): Promise<string> {
    const groups = this.groupRulesByCategory(rules);
    
    const yamlConfig = {
      groups: Object.entries(groups).map(([category, categoryRules]) => ({
        name: `${category.toLowerCase()}_alerts`,
        rules: categoryRules.map(rule => this.convertToPrometheusRule(rule))
      }))
    };

    return yaml.dump(yamlConfig, { indent: 2 });
  }

  /**
   * Импортировать правила из YAML
   */
  async importFromYaml(yamlContent: string): Promise<AlertRuleConfig[]> {
    try {
      const config = yaml.load(yamlContent) as any;
      const rules: AlertRuleConfig[] = [];

      if (config.groups) {
        for (const group of config.groups) {
          if (group.rules) {
            for (const rule of group.rules) {
              rules.push(this.convertFromPrometheusRule(rule, group.name));
            }
          }
        }
      }

      return rules;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Ошибка парсинга YAML: ${errorMessage}`);
    }
  }

  /**
   * Сгенерировать PromQL выражение на основе шаблона
   */
  generateExpression(template: string, threshold?: number, operator?: string): string {
    let expression = template;
    
    if (threshold !== undefined && operator) {
      const promOperator = this.convertOperatorToPromQL(operator as ComparisonOperator);
      expression = `${template} ${promOperator} ${threshold}`;
    }

    return expression;
  }

  /**
   * Валидировать PromQL выражение
   */
  validateExpression(expression: string): boolean {
    // Базовая валидация PromQL
    const promqlPattern = /^[a-zA-Z_:][a-zA-Z0-9_:]*.*$/;
    return promqlPattern.test(expression.trim());
  }

  /**
   * Сохранить правила в файл
   */
  async saveRulesToFile(rules: AlertRuleConfig[], filename: string): Promise<void> {
    const yamlContent = await this.exportToYaml(rules);
    const filePath = path.join(this.rulesPath, filename);
    await fs.writeFile(filePath, yamlContent, 'utf8');
  }

  /**
   * Загрузить правила из файла
   */
  async loadRulesFromFile(filename: string): Promise<AlertRuleConfig[]> {
    const filePath = path.join(this.rulesPath, filename);
    const yamlContent = await fs.readFile(filePath, 'utf8');
    return this.importFromYaml(yamlContent);
  }

  // Приватные методы
  private validateMetricName(metric: string): boolean {
    const metricPattern = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
    return metricPattern.test(metric);
  }

  private validateDuration(duration: string): boolean {
    const durationPattern = /^\d+[smhd]$/;
    return durationPattern.test(duration);
  }

  private groupRulesByCategory(rules: AlertRuleConfig[]): Record<string, AlertRuleConfig[]> {
    return rules.reduce((groups, rule) => {
      const category = rule.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(rule);
      return groups;
    }, {} as Record<string, AlertRuleConfig[]>);
  }

  private convertToPrometheusRule(rule: AlertRuleConfig): any {
    return {
      alert: rule.name,
      expr: rule.expression,
      for: rule.duration,
      labels: {
        severity: rule.severity.toLowerCase(),
        category: rule.category.toLowerCase(),
        ...rule.labels
      },
      annotations: {
        summary: rule.description,
        description: `Alert rule: ${rule.name}`
      }
    };
  }

  private convertFromPrometheusRule(rule: any, groupName: string): AlertRuleConfig {
    return {
      id: '', // Будет установлен при сохранении в БД
      name: rule.alert,
      category: this.extractCategoryFromGroup(groupName),
      metric: this.extractMetricFromExpression(rule.expr),
      expression: rule.expr,
      duration: rule.for || '5m',
      severity: (rule.labels?.severity?.toUpperCase() || 'WARNING') as AlertSeverity,
      description: rule.annotations?.summary || rule.annotations?.description || '',
      labels: rule.labels || {},
      enabled: true
    };
  }

  private extractCategoryFromGroup(groupName: string): AlertCategory {
    if (groupName.includes('hardware')) return AlertCategory.HARDWARE_CHANGE;
    if (groupName.includes('performance')) return AlertCategory.PERFORMANCE;
    if (groupName.includes('health')) return AlertCategory.HEALTH;
    return AlertCategory.CUSTOM;
  }

  private extractMetricFromExpression(expression: string): string {
    const match = expression.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)/);
    return match ? match[1] : 'unknown_metric';
  }

  private convertOperatorToPromQL(operator: ComparisonOperator): string {
    const operatorMap = {
      [ComparisonOperator.GREATER_THAN]: '>',
      [ComparisonOperator.LESS_THAN]: '<',
      [ComparisonOperator.GREATER_EQUAL]: '>=',
      [ComparisonOperator.LESS_EQUAL]: '<=',
      [ComparisonOperator.EQUAL]: '==',
      [ComparisonOperator.NOT_EQUAL]: '!='
    };
    return operatorMap[operator] || '>';
  }
}