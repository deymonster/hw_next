import { PrismaClient, AlertRule } from '@prisma/client';
import { BaseRepository } from '@/services/base.service';
import { 
  IAlertRuleCreateInput, 
  IAlertRuleFindManyArgs, 
  AlertRulesStats, 
  AlertCategory
} from './alert-rules.types';
import { IAlertRulesService } from './alert-rules.interfaces';



/**
 * Простой CRUD сервис для работы с AlertRule
 * Наследуется от BaseRepository для базовых операций
 */
export class AlertRulesService 
  extends BaseRepository<
    AlertRule, 
    IAlertRuleCreateInput, 
    IAlertRuleFindManyArgs, 
    PrismaClient['alertRule'], 
    string
  > 
  implements IAlertRulesService 
{
  constructor(prisma: PrismaClient) {
    super(prisma, (p) => p.alertRule);
  }

  /**
   * Получить все правила пользователя
   */
  async getUserRules(userId: string): Promise<AlertRule[]> {
    return this.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Получить активные правила
   */
  async getActiveRules(): Promise<AlertRule[]> {
    return this.findMany({
      where: { enabled: true },
      include: { user: true }
    });
  }

  /**
   * Получить правила по категории
   */
  async getRulesByCategory(category: AlertCategory): Promise<AlertRule[]> {
    return this.findMany({
      where: { category },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Переключить статус правила
   */
  async toggleRule(id: string): Promise<AlertRule> {
    const rule = await this.findById(id);
    if (!rule) {
      throw new Error('Alert rule not found');
    }
    
    return this.update(id, {
      enabled: !rule.enabled
    });
  }

  /**
   * Создать правило с валидацией
   */
  async createRule(data: IAlertRuleCreateInput): Promise<AlertRule> {
    // Базовая валидация
    if (!data.name?.trim()) {
      throw new Error('Rule name is required');
    }
    
    if (!data.metric?.trim()) {
      throw new Error('Metric is required');
    }

    if (!data.expression?.trim()) {
      throw new Error('Expression is required');
    }

    if (!data.user?.connect?.id) {
      throw new Error('User ID is required');
    }

    // Установить значения по умолчанию
    const ruleData: IAlertRuleCreateInput = {
      ...data,
      enabled: data.enabled ?? true,
      labels: data.labels ?? undefined
    };

    return this.create(ruleData);
  }

  /**
   * Получить статистику правил
   */
  async getRulesStats(userId?: string): Promise<AlertRulesStats> {
    const where = userId ? { userId } : {};
    
    const [total, active, byCategory] = await Promise.all([
      this.model.count({ where }),
      this.model.count({ where: { ...where, enabled: true } }),
      this.model.groupBy({
        by: ['category'],
        where,
        _count: { category: true }
      })
    ]);

    return {
      total,
      active,
      inactive: total - active,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item.category] = item._count.category;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Получить правила с пагинацией
   */
  async getRulesWithPagination(
    page: number = 1, 
    limit: number = 10, 
    userId?: string,
    category?: string
  ): Promise<{
    rules: AlertRule[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (userId) where.userId = userId;
    if (category) where.category = category;

    const [rules, total] = await Promise.all([
      this.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } }
      }),
      this.model.count({ where })
    ]);

    return {
      rules,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Поиск правил по названию или описанию
   */
  async searchRules(query: string, userId?: string): Promise<AlertRule[]> {
    const where: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (userId) {
      where.userId = userId;
    }

    return this.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Массовое обновление статуса правил
   */
  async bulkToggleRules(ids: string[], enabled: boolean): Promise<number> {
    const result = await this.model.updateMany({
      where: { id: { in: ids } },
      data: { enabled }
    });

    return result.count;
  }

  /**
   * Удалить все правила пользователя
   */
  async deleteUserRules(userId: string): Promise<number> {
    const result = await this.model.deleteMany({
      where: { userId }
    });

    return result.count;
  }
}