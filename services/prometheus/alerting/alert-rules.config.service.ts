import { IAlertRulesConfigService } from './alert-rules.config.service.interface';
import { 
  AlertRuleConfig, 
  CreateAlertRuleRequest, 
  UpdateAlertRuleRequest, 
  AlertRuleValidationResult 
} from './alert-rules.config.types';
import { AlertCategory, AlertSeverity, ChangeType, ComparisonOperator } from './alert-rules.types';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Сервис для работы с конфигурационными файлами Prometheus
 * Отвечает за валидацию, экспорт/импорт YAML, генерацию PromQL
 */
export class AlertRulesConfigService implements IAlertRulesConfigService {
  /**
   * URL для доступа к Prometheus API
   * @private
   */
  private readonly prometheusUrl: string;
  
  /**
   * Путь к директории с файлами правил Prometheus
   * @private
   */
  private readonly rulesPath: string;

  /**
   * Создает экземпляр сервиса конфигурации правил оповещений
   * @param config Объект конфигурации с URL Prometheus и путем к файлам правил
   */
  constructor(config: { prometheusUrl: string; rulesPath: string }) {
    this.prometheusUrl = config.prometheusUrl;
    this.rulesPath = config.rulesPath;
  }

  /**
   * Валидирует правило перед созданием или обновлением
   * Проверяет корректность всех полей и их соответствие требованиям
   * @param config Объект с параметрами создания или обновления правила
   * @returns Результат валидации с флагом успешности и списками ошибок и предупреждений
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

    // Валидация категории
    if ('category' in config) {
      if (!Object.values(AlertCategory).includes(config.category)) {
        errors.push('Некорректная категория правила');
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

    // Валидация для правил изменения оборудования
    if (this.isHardwareChange(config)) {
      if (!config.changeType) {
        errors.push('Тип изменения обязателен для правил HARDWARE_CHANGE');
      } else {
        // Валидация типа изменения
        if (!Object.values(ChangeType).includes(config.changeType)) {
          errors.push('Некорректный тип изменения');
        }
        
        if (config.changeType === ChangeType.THRESHOLD) {
          if (config.threshold === undefined) {
            errors.push('Пороговое значение обязательно для типа THRESHOLD');
          }
          if (!config.operator) {
            errors.push('Оператор сравнения обязателен для типа THRESHOLD');
          }
        }
      }
    }

    // Предупреждения
    if (config.threshold && config.threshold > 100) {
      warnings.push('Высокое пороговое значение может привести к частым срабатываниям');
    }

    // Предупреждение для правил без выражения
    if ('category' in config && !config.expression) {
      warnings.push('Рекомендуется указать PromQL выражение для более точного контроля');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Перезагружает конфигурацию Prometheus через API
   * Отправляет POST-запрос на эндпоинт /-/reload
   * @returns Promise с результатом операции (true - успешно, false - ошибка)
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
   * Экспортирует правила в YAML формат для Prometheus
   * Группирует правила по категориям и конвертирует их в формат Prometheus
   * @param rules Массив правил для экспорта
   * @returns Promise со строкой в формате YAML
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
   * Импортирует правила из YAML формата Prometheus
   * Парсит YAML и конвертирует правила в формат приложения
   * @param yamlContent Строка с содержимым YAML файла
   * @returns Promise с массивом импортированных правил
   * @throws Error при ошибке парсинга YAML
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
   * Генерирует PromQL выражение на основе параметров правила
   * Для разных категорий правил используются разные шаблоны выражений
   * @param metric Название метрики
   * @param category Категория правила
   * @param changeType Тип изменения (для правил HARDWARE_CHANGE)
   * @param threshold Пороговое значение
   * @param operator Оператор сравнения
   * @returns Строка с PromQL выражением
   */
  generateExpression(
    metric: string,
    category: AlertCategory,
    changeType?: ChangeType,
    threshold?: number,
    operator?: ComparisonOperator,
  ): string | string[] {
    // Для правил изменения оборудования используем специальный метод
    if (this.isHardwareChangeCategory(category)) {
      return this.generateHardwareChangeRule(metric);
    }
    // Для других категорий - стандартная логика
    let expression = metric;
 
    if (threshold !== undefined && operator) {
      const promOperator = this.convertOperatorToPromQL(operator);
      expression = `${metric} ${promOperator} ${threshold}`;
    }
  
    // Добавление группировки по instance если требуется
    if (!expression.includes('by (instance)') && 
        !expression.startsWith('changes(') && 
        !expression.startsWith('delta(')) {
      if (expression.includes('(')) {
        
        expression = expression.replace(/\)(?!.*\))/, ') by (instance)'); 
      } else {
        expression = `(${expression}) by (instance)`;
      }
    }
  
    return expression;
  }

  /**
   * Генерирует PromQL выражение для правил категории HARDWARE_CHANGE
   * Создает сложное выражение для обнаружения изменений в метриках оборудования
   * @param metric Название метрики оборудования
   * @param changeType Тип изменения
   * @param threshold Пороговое значение (для типа THRESHOLD)
   * @param operator Оператор сравнения (для типа THRESHOLD)
   * @returns Строка с PromQL выражением
   * @private
   */
  private generateHardwareChangeRule(
    metric: string
  ): string | string[] {
    // Для категории HARDWARE_CHANGE всегда используем специальную метрику UNIQUE_ID_CHANGED
    return "UNIQUE_ID_CHANGED == 1";
  }

  /**
   * Возвращает список всех метрик оборудования
   * @returns Массив названий метрик
   * @public
   */
  public getHardwareMetrics(): string[] {
    return [
      'cpu_info',
      'motherboard_info',
      'memory_info',
      'disk_info',
      'gpu_info',
      'network_info',
      'bios_info',
      'memory_module_info',
      'gpu_memory_bytes',
      'disk_health_status',
      'network_status'
    ];
  }

  /**
   * Генерирует PromQL выражение для конкретной метрики оборудования
   * @param metric Название метрики оборудования
   * @returns Строка с PromQL выражением
   * @private
   */
  private generateSingleHardwareChangeRule(metric: string): string {
    const config = this.getHardwareMetricConfig(metric);
    
    // Основное PromQL выражение для обнаружения изменений
    const expression = `count by (instance) (
      count by (instance, ${config.labelName}) (
        count by(${config.labelName}) (${metric}[24h])
      )
    ) > 1
    and on(instance)
    label_replace(
      ${metric} != ignoring(${config.labelName}) group_left()
      last_over_time(${metric}[24h]),
      "old_${config.labelName}", "$1", "${config.labelName}", "(.+)"
    )`;
    
    return expression;
  }

  /**
   * Возвращает конфигурацию метрики оборудования
   * Содержит информацию о названии метки, компоненте и описании
   * @param metric Название метрики оборудования
   * @returns Объект с конфигурацией метрики
   * @private
   */
  private getHardwareMetricConfig(metric: string): {
    labelName: string;
    component: string;
    description: string;
  } {
    const hardwareMetrics: Record<string, { labelName: string; component: string; description: string }> = {
      'cpu_info': {
        labelName: 'model_name',
        component: 'процессор',
        description: 'Информация о процессоре'
      },
      'motherboard_info': {
        labelName: 'product',
        component: 'материнская плата',
        description: 'Информация о материнской плате'
      },
      'memory_info': {
        labelName: 'manufacturer',
        component: 'оперативная память',
        description: 'Информация об оперативной памяти'
      },
      'disk_info': {
        labelName: 'model',
        component: 'жесткий диск',
        description: 'Информация о жестком диске'
      },
      'gpu_info': {
        labelName: 'name',
        component: 'видеокарта',
        description: 'Информация о видеокарте'
      },
      'network_info': {
        labelName: 'description',
        component: 'сетевая карта',
        description: 'Информация о сетевой карте'
      }
    };
    
    return hardwareMetrics[metric] || {
      labelName: 'value',
      component: 'компонент',
      description: 'Информация о компоненте'
    };
  }

  /**
   * Валидирует PromQL выражение на базовом уровне
   * Проверяет соответствие выражения базовому паттерну PromQL
   * @param expression Строка с PromQL выражением
   * @returns true, если выражение валидно, иначе false
   */
  validateExpression(expression: string): boolean {
    // Базовая валидация PromQL
    const promqlPattern = /^[a-zA-Z_:][a-zA-Z0-9_:]*.*$/;
    return promqlPattern.test(expression.trim());
  }

  /**
   * Проверяет, относится ли правило к категории изменения оборудования
   * @param config Конфигурация правила
   * @returns true, если правило относится к категории HARDWARE_CHANGE
   * @private
   */
  private isHardwareChange(config: CreateAlertRuleRequest | UpdateAlertRuleRequest): boolean {
    return 'category' in config && config.category === AlertCategory.HARDWARE_CHANGE; 
  }

  /**
   * Проверяет, является ли категория категорией изменения оборудования
   * @param category Категория правила
   * @returns true, если категория равна HARDWARE_CHANGE
   * @private
   */
  private isHardwareChangeCategory(category: AlertCategory): boolean {
    return category === AlertCategory.HARDWARE_CHANGE;
  }

  /**
   * Сохраняет правила в YAML файл
   * Экспортирует правила в YAML и записывает в файл по указанному пути
   * @param rules Массив правил для сохранения
   * @param filename Имя файла (без пути)
   * @returns Promise с результатом операции
   */
  async saveRulesToFile(rules: AlertRuleConfig[], filename: string): Promise<void> {
    const yamlContent = await this.exportToYaml(rules);
    const filePath = path.join(this.rulesPath, filename);
    await fs.writeFile(filePath, yamlContent, 'utf8');
  }

  /**
   * Загружает правила из YAML файла
   * Читает файл и импортирует правила из YAML
   * @param filename Имя файла (без пути)
   * @returns Promise с массивом загруженных правил
   */
  async loadRulesFromFile(filename: string): Promise<AlertRuleConfig[]> {
    const filePath = path.join(this.rulesPath, filename);
    const yamlContent = await fs.readFile(filePath, 'utf8');
    return this.importFromYaml(yamlContent);
  }

  /**
   * Валидирует название метрики
   * Проверяет соответствие названия метрики паттерну Prometheus
   * @param metric Название метрики
   * @returns true, если название валидно, иначе false
   * @private
   */
  private validateMetricName(metric: string): boolean {
    const metricPattern = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
    return metricPattern.test(metric);
  }

  /**
   * Валидирует строку длительности
   * Проверяет соответствие строки формату Prometheus (число + единица измерения)
   * @param duration Строка длительности (например, "5m", "1h")
   * @returns true, если строка валидна, иначе false
   * @private
   */
  private validateDuration(duration: string): boolean {
    const durationPattern = /^\d+[smhd]$/;
    return durationPattern.test(duration);
  }

  /**
   * Группирует правила по категориям
   * Создает объект, где ключи - категории, а значения - массивы правил
   * @param rules Массив правил для группировки
   * @returns Объект с правилами, сгруппированными по категориям
   * @private
   */
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

  /**
   * Конвертирует правило в формат Prometheus
   * Создает объект с полями alert, expr, for, labels и annotations
   * @param rule Правило в формате приложения
   * @returns Объект правила в формате Prometheus
   * @private
   */
  private convertToPrometheusRule(rule: AlertRuleConfig): any {
    const annotations: Record<string, string> = {
      summary: rule.description,
      description: `Alert rule: ${rule.name}`
    };

    if (this.isHardwareChangeCategory(rule.category)) {
      // Получаем конфигурацию метрики, если она доступна
      const metricConfig = this.getHardwareMetricConfig(rule.metric);
      const labelName = metricConfig.labelName;
      
      annotations.description = `
        • IP: {{ $labels.ip | default($labels.instance | reReplace ":\\d+" "") }}
        • Было: {{ $labels.old_${labelName} }}
        • Стало: {{ $labels.${labelName} }}
        {{- if not (eq $labels.${labelName} $labels.old_${labelName}) }}
        ⚠ Изменение обнаружено в {{ $labels.instance }}
        {{- end }}
      `;
    }
    return {
      alert: rule.name,
      expr: rule.expression,
      for: rule.duration,
      labels: {
        severity: rule.severity.toLowerCase(),
        category: rule.category.toLowerCase(),
        ...rule.labels
      },
      annotations
    };
  }

  /**
   * Конвертирует правило из формата Prometheus в формат приложения
   * Извлекает информацию из объекта Prometheus и создает объект AlertRuleConfig
   * @param rule Правило в формате Prometheus
   * @param groupName Название группы правил
   * @returns Объект правила в формате приложения
   * @private
   */
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

  /**
   * Извлекает категорию из названия группы правил
   * Определяет категорию на основе ключевых слов в названии группы
   * @param groupName Название группы правил
   * @returns Категория правила
   * @private
   */
  private extractCategoryFromGroup(groupName: string): AlertCategory {
    if (groupName.includes('hardware')) return AlertCategory.HARDWARE_CHANGE;
    if (groupName.includes('performance')) return AlertCategory.PERFORMANCE;
    if (groupName.includes('health')) return AlertCategory.HEALTH;
    return AlertCategory.CUSTOM;
  }

  /**
   * Извлекает название метрики из PromQL выражения
   * Находит первую часть выражения, соответствующую паттерну метрики
   * @param expression Строка с PromQL выражением
   * @returns Название метрики или 'unknown_metric', если не удалось извлечь
   * @private
   */
  private extractMetricFromExpression(expression: string): string {
    const match = expression.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)/); 
    return match ? match[1] : 'unknown_metric';
  }

  /**
   * Конвертирует оператор сравнения в PromQL формат
   * Преобразует enum ComparisonOperator в строковый оператор PromQL
   * @param operator Оператор сравнения из enum
   * @returns Строковое представление оператора для PromQL
   */
  convertOperatorToPromQL(operator: ComparisonOperator): string {
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