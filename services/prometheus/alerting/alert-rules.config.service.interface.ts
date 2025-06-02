import { 
    AlertRuleConfig, 
    CreateAlertRuleRequest, 
    UpdateAlertRuleRequest, 
    AlertRuleValidationResult 
  } from './alert-rules.config.types';
  
  /**
   * Интерфейс для сервиса работы с конфигурационными файлами Prometheus
   * Отвечает ТОЛЬКО за работу с файлами и валидацию
   */
  export interface IAlertRulesConfigService {
    /**
     * Валидировать правило
     */
    validateRule(config: CreateAlertRuleRequest | UpdateAlertRuleRequest): Promise<AlertRuleValidationResult>;
    
    /**
     * Перезагрузить конфигурацию Prometheus
     */
    reloadPrometheus(): Promise<boolean>;
    
    /**
     * Экспортировать правила в YAML
     */
    exportToYaml(rules: AlertRuleConfig[]): Promise<string>;
    
    /**
     * Импортировать правила из YAML
     */
    importFromYaml(yamlContent: string): Promise<AlertRuleConfig[]>;
    
    /**
     * Сгенерировать PromQL выражение
     */
    generateExpression(template: string, threshold?: number, operator?: string): string;
    
    /**
     * Валидировать PromQL выражение
     */
    validateExpression(expression: string): boolean;
  }