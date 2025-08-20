import { Event, Prisma, PrismaClient } from '@prisma/client'

import { BaseRepository } from './base.service'
import {
	IEventCreateInput,
	IEventFindManyArgs,
	IEventRepository
} from './event.interfaces'

/**
 * Сервис для управления событиями (уведомлениями) в системе.
 * Предоставляет методы для создания, чтения, обновления и удаления событий,
 * а также специализированные методы для работы с уведомлениями пользователей.
 * 
 * @class EventService
 * @extends BaseRepository
 * @implements IEventRepository
 * 
 * @example
 * ```typescript
 * const eventService = new EventService(prisma);
 * const unreadEvents = await eventService.findUnreadByUserId('user-id');
 * ```
 */
export class EventService
	extends BaseRepository<
		Event,
		IEventCreateInput,
		IEventFindManyArgs,
		PrismaClient['event'],
		string
	>
	implements IEventRepository
{
	/**
	 * Конструктор сервиса событий.
	 * 
	 * @param {PrismaClient} prisma - Экземпляр Prisma клиента для работы с базой данных
	 */
	constructor(prisma: PrismaClient) {
		super(prisma, p => p.event)
	}

	/**
	 * Получает все непрочитанные события для указанного пользователя.
	 * События сортируются по дате создания в убывающем порядке (новые сначала).
	 * 
	 * @param {string} userId - Уникальный идентификатор пользователя
	 * @returns {Promise<Event[]>} Массив непрочитанных событий
	 * 
	 * @example
	 * ```typescript
	 * const unreadEvents = await eventService.findUnreadByUserId('user-123');
	 * console.log(`Найдено ${unreadEvents.length} непрочитанных событий`);
	 * ```
	 */
	async findUnreadByUserId(userId: string): Promise<Event[]> {
		return await this.model.findMany({
			where: {
				userId,
				isRead: false
			},
			orderBy: { createdAt: 'desc' }
		})
	}

	/**
	 * Получает события пользователя с возможностью пагинации и сортировки.
	 * 
	 * @param {string} userId - Уникальный идентификатор пользователя
	 * @param {Object} [options] - Опции для запроса
	 * @param {number} [options.take=10] - Количество событий для получения
	 * @param {number} [options.skip=0] - Количество событий для пропуска (для пагинации)
	 * @param {string} [options.orderBy='createdAt'] - Поле для сортировки
	 * @param {'asc'|'desc'} [options.orderDir='desc'] - Направление сортировки
	 * @returns {Promise<Event[]>} Массив событий пользователя
	 * 
	 * @example
	 * ```typescript
	 * // Получить первые 20 событий
	 * const events = await eventService.findByUserId('user-123', { take: 20 });
	 * 
	 * // Получить события с пагинацией (вторая страница по 10 элементов)
	 * const page2Events = await eventService.findByUserId('user-123', { 
	 *   take: 10, 
	 *   skip: 10 
	 * });
	 * ```
	 */
	async findByUserId(
		userId: string,
		options?: {
			take?: number
			skip?: number
			orderBy?: string
			orderDir?: 'asc' | 'desc'
		}
	): Promise<Event[]> {
		const {
			take = 10,
			skip = 0,
			orderBy = 'createdAt',
			orderDir = 'desc'
		} = options || {}

		return await this.model.findMany({
			where: { userId },
			orderBy: { [orderBy]: orderDir },
			take,
			skip
		})
	}

	/**
	 * Подсчитывает количество событий, соответствующих заданным условиям.
	 * 
	 * @param {Prisma.EventWhereInput} [where] - Условия фильтрации для подсчета
	 * @returns {Promise<number>} Количество событий
	 * 
	 * @example
	 * ```typescript
	 * // Подсчитать все события
	 * const totalEvents = await eventService.count();
	 * 
	 * // Подсчитать непрочитанные события пользователя
	 * const unreadCount = await eventService.count({
	 *   userId: 'user-123',
	 *   isRead: false
	 * });
	 * ```
	 */
	async count(where?: Prisma.EventWhereInput): Promise<number> {
		return await this.model.count({ where })
	}

	/**
	 * Получает события пользователя и атомарно помечает их как прочитанные.
	 * Использует транзакцию для обеспечения консистентности данных.
	 * 
	 * @param {string} userId - Уникальный идентификатор пользователя
	 * @param {number} [take=10] - Количество событий для получения и обновления
	 * @returns {Promise<Event[]>} Массив событий (включая те, что были помечены как прочитанные)
	 * 
	 * @example
	 * ```typescript
	 * // Получить и пометить как прочитанные последние 15 событий
	 * const events = await eventService.findAndMarkAsRead('user-123', 15);
	 * console.log(`Получено и обновлено ${events.length} событий`);
	 * ```
	 */
	async findAndMarkAsRead(
		userId: string,
		take: number = 10
	): Promise<Event[]> {
		// Транзакция для атомарного получения и обновления
		return await this.prisma.$transaction(async tx => {
			// Получаем уведомления
			const notifications = await tx.event.findMany({
				where: { userId },
				orderBy: { createdAt: 'desc' },
				take
			})

			// Обновляем статус непрочитанных уведомлений
			if (notifications.length > 0) {
				await tx.event.updateMany({
					where: {
						userId,
						isRead: false,
						id: { in: notifications.map(n => n.id) }
					},
					data: { isRead: true }
				})
			}

			return notifications
		})
	}

	/**
	 * Получает все события пользователя и помечает все непрочитанные как прочитанные.
	 * Возвращает все события и количество обновленных записей.
	 * 
	 * @param {string} userId - Уникальный идентификатор пользователя
	 * @returns {Promise<{events: Event[], unreadCount: number}>} Объект с событиями и количеством обновленных
	 * 
	 * @example
	 * ```typescript
	 * const result = await eventService.findAndMarkAsReadAll('user-123');
	 * console.log(`Получено ${result.events.length} событий`);
	 * console.log(`Помечено как прочитанные ${result.unreadCount} событий`);
	 * ```
	 */
	async findAndMarkAsReadAll(
		userId: string
	): Promise<{ events: Event[]; unreadCount: number }> {
		// Транзакция для атомарного получения и обновления
		return await this.prisma.$transaction(async tx => {
			// Получаем все уведомления пользователя
			const events = await tx.event.findMany({
				where: { userId },
				orderBy: { createdAt: 'desc' }
			})

			// Обновляем статус непрочитанных уведомлений
			const updateResult = await tx.event.updateMany({
				where: {
					userId,
					isRead: false
				},
				data: { isRead: true }
			})

			return {
				events,
				unreadCount: updateResult.count // количество обновленных (бывших непрочитанных) уведомлений
			}
		})
	}

	/**
	 * Получает количество непрочитанных событий для пользователя.
	 * 
	 * @param {string} userId - Уникальный идентификатор пользователя
	 * @returns {Promise<number>} Количество непрочитанных событий
	 * 
	 * @example
	 * ```typescript
	 * const unreadCount = await eventService.getUnreadCount('user-123');
	 * if (unreadCount > 0) {
	 *   console.log(`У пользователя ${unreadCount} непрочитанных уведомлений`);
	 * }
	 * ```
	 */
	async getUnreadCount(userId: string): Promise<number> {
		return await this.model.count({
			where: {
				userId,
				isRead: false
			}
		})
	}

	/**
	 * Помечает конкретное событие как прочитанное по его идентификатору.
	 * 
	 * @param {string} id - Уникальный идентификатор события
	 * @returns {Promise<Event>} Обновленное событие
	 * @throws {Error} Если событие не найдено или произошла ошибка при обновлении
	 * 
	 * @example
	 * ```typescript
	 * try {
	 *   const updatedEvent = await eventService.markAsRead('event-123');
	 *   console.log(`Событие ${updatedEvent.id} помечено как прочитанное`);
	 * } catch (error) {
	 *   console.error('Ошибка при обновлении события:', error.message);
	 * }
	 * ```
	 */
	async markAsRead(id: string): Promise<Event> {
		try {
			const notification = await this.model.update({
				where: { id },
				data: { isRead: true }
			})
			if (!notification) {
				throw new Error(`Notification with id ${id} not found`)
			}
			return notification
		} catch (error) {
			console.error(`[MARK_AS_READ_ERROR]`, error)
			throw new Error('Failed to mark notification as read')
		}
	}

	/**
	 * Помечает все непрочитанные события пользователя как прочитанные.
	 * 
	 * @param {string} userId - Уникальный идентификатор пользователя
	 * @returns {Promise<Prisma.BatchPayload>} Результат массового обновления с количеством обновленных записей
	 * @throws {Error} Если произошла ошибка при обновлении
	 * 
	 * @example
	 * ```typescript
	 * try {
	 *   const result = await eventService.markAllAsRead('user-123');
	 *   console.log(`Помечено как прочитанные ${result.count} событий`);
	 * } catch (error) {
	 *   console.error('Ошибка при массовом обновлении:', error.message);
	 * }
	 * ```
	 */
	async markAllAsRead(userId: string) {
		try {
			return await this.model.updateMany({
				where: {
					userId,
					isRead: false
				},
				data: { isRead: true }
			})
		} catch (error) {
			console.error(`[MARK_ALL_AS_READ_ERROR]`, error)
			throw new Error('Failed to mark all notifications as read')
		}
	}

	/**
	 * Удаляет все события указанного пользователя.
	 * 
	 * @param {string} userId - Уникальный идентификатор пользователя
	 * @returns {Promise<Prisma.BatchPayload>} Результат массового удаления с количеством удаленных записей
	 * 
	 * @example
	 * ```typescript
	 * const result = await eventService.deleteMany('user-123');
	 * console.log(`Удалено ${result.count} событий пользователя`);
	 * ```
	 */
	async deleteMany(userId: string) {
		return await this.model.deleteMany({
			where: { userId }
		})
	}

	/**
	 * Подтверждает события об изменении оборудования для указанного устройства.
	 * Помечает все неподтвержденные события типа "Hardware_Change_Detected" как подтвержденные.
	 * 
	 * @param {string} deviceId - Уникальный идентификатор устройства
	 * @returns {Promise<{count: number}>} Объект с количеством обновленных событий
	 * @throws {Error} Если произошла ошибка при обновлении событий
	 * 
	 * @example
	 * ```typescript
	 * try {
	 *   const result = await eventService.confirmHardwareChangeEvents('device-123');
	 *   console.log(`Подтверждено ${result.count} событий об изменении оборудования`);
	 * } catch (error) {
	 *   console.error('Ошибка при подтверждении событий:', error.message);
	 * }
	 * ```
	 */
	async confirmHardwareChangeEvents(deviceId: string): Promise<{ count: number }> {
		try {
			// Обновляем все неподтвержденные события об изменении оборудования для устройства
			const result = await this.model.updateMany({
				where: {
					deviceId: deviceId,
					title: { contains: 'Hardware_Change_Detected' },
					hardwareChangeConfirmed: false
				},
				data: {
					hardwareChangeConfirmed: true
				}
			})
			return { count: result.count }
		} catch (error) {
			console.error(`[CONFIRM_HARDWARE_CHANGE_EVENTS_ERROR]`, error)
			throw new Error('Failed to confirm hardware change events')
		}
	}
}
