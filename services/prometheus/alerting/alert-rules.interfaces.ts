import { AlertRule } from '@prisma/client';
import { IAlertRuleCreateInput, IAlertRuleFindManyArgs, AlertRulesStats } from './alert-rules.types';

/**
 * Интерфейс для базового CRUD сервиса AlertRules
 * Отвечает ТОЛЬКО за работу с базой данных
 */
export interface IAlertRulesService {
  // Базовые CRUD операции
  findMany(args?: IAlertRuleFindManyArgs): Promise<AlertRule[]>;
  findById(id: string): Promise<AlertRule | null>;
  create(data: IAlertRuleCreateInput): Promise<AlertRule>;
  update(id: string, data: Partial<IAlertRuleCreateInput>): Promise<AlertRule>;
  delete(id: string): Promise<AlertRule>;
  
  // Специфичные методы для работы с данными
  getUserRules(userId: string): Promise<AlertRule[]>;
  getActiveRules(): Promise<AlertRule[]>;
  getRulesByCategory(category: string): Promise<AlertRule[]>;
  toggleRule(id: string): Promise<AlertRule>;
  createRule(data: IAlertRuleCreateInput): Promise<AlertRule>;
  getRulesStats(userId?: string): Promise<AlertRulesStats>;
}