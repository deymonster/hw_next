import { Device, DeviceStatus, DeviceType, PrismaClient } from '@prisma/client'

import { BaseRepository } from '../base.service'
import {
	DeviceActivationUpdateInput,
	DeviceFilterOptions,
	IDeviceCreateInput,
	IDeviceFindManyArgs,
	IDeviceRepository
} from './device.interfaces'

import { services } from '@/services'

/**
 * Сервис для управления устройствами в системе мониторинга
 *
 * Предоставляет методы для:
 * - CRUD операций с устройствами
 * - Управления статусами устройств
 * - Поиска и фильтрации устройств
 * - Получения статистики
 * - Взаимодействия с агентами мониторинга
 *
 * @extends BaseRepository
 * @implements IDeviceRepository
 */
export class DeviceService
	extends BaseRepository<
		Device,
		IDeviceCreateInput,
		IDeviceFindManyArgs,
		PrismaClient['device'],
		string
	>
	implements IDeviceRepository
{
	/**
	 * Конструктор сервиса устройств
	 *
	 * @param prisma - Экземпляр Prisma клиента для работы с базой данных
	 */
	constructor(prisma: PrismaClient) {
		super(prisma, p => p.device)
	}

	/**
	 * Поиск устройства по уникальному ключу агента
	 *
	 * @param agentKey - Уникальный ключ агента мониторинга
	 * @returns Promise<Device | null> - Найденное устройство или null
	 *
	 * @example
	 * ```typescript
	 * const device = await deviceService.findByAgentKey('agent-123')
	 * if (device) {
	 *   console.log(`Найдено устройство: ${device.name}`)
	 * }
	 * ```
	 */
	async findByAgentKey(agentKey: string): Promise<Device | null> {
		return await this.model.findUnique({
			where: { agentKey }
		})
	}

	/**
	 * Получение всех устройств с возможностью фильтрации
	 *
	 * @param options - Опции фильтрации и сортировки
	 * @param options.status - Массив статусов для фильтрации
	 * @param options.type - Тип устройства для фильтрации
	 * @param options.departmentId - ID отдела для фильтрации
	 * @param options.orderBy - Параметры сортировки
	 * @returns Promise<Device[]> - Массив устройств
	 *
	 * @example
	 * ```typescript
	 * // Получить все активные Windows устройства
	 * const devices = await deviceService.findAll({
	 *   status: ['ACTIVE'],
	 *   type: 'WINDOWS'
	 * })
	 * ```
	 */
	async findAll(options?: DeviceFilterOptions): Promise<Device[]> {
		// Создаем базовые условия where
		const whereConditions: any = {
			...(options?.status && { status: { in: options.status } }),
			...(options?.type && { type: options.type }),
			...(options?.departmentId && { departmentId: options.departmentId })
		}

		// Если есть условие OR, добавляем его
		if (options && 'OR' in options) {
			whereConditions.OR = (options as any).OR
		}
		return await this.model.findMany({
			where: whereConditions,
			orderBy: options?.orderBy
				? { [options.orderBy.field]: options.orderBy.direction }
				: { lastUpdate: 'desc' } // По умолчанию сортируем по последнему обновлению
		})
	}

	/**
	 * Получение статистики по устройствам
	 *
	 * Возвращает общее количество устройств и их распределение
	 * по статусам и типам
	 *
	 * @returns Promise<Object> - Объект со статистикой
	 * @returns Promise<Object>.total - Общее количество устройств
	 * @returns Promise<Object>.byStatus - Распределение по статусам
	 * @returns Promise<Object>.byType - Распределение по типам
	 *
	 * @example
	 * ```typescript
	 * const stats = await deviceService.getDeviceStats()
	 * console.log(`Всего устройств: ${stats.total}`)
	 * console.log(`Активных: ${stats.byStatus.ACTIVE || 0}`)
	 * ```
	 */
	async getDeviceStats(): Promise<{
		total: number
		byStatus: Record<DeviceStatus, number>
		byType: Record<DeviceType, number>
	}> {
		const devices = await this.model.findMany()
		return {
			total: devices.length,
			byStatus: devices.reduce(
				(acc, device) => ({
					...acc,
					[device.status]: (acc[device.status] || 0) + 1
				}),
				{} as Record<DeviceStatus, number>
			),
			byType: devices.reduce(
				(acc, device) => ({
					...acc,
					[device.type]: (acc[device.type] || 0) + 1
				}),
				{} as Record<DeviceType, number>
			)
		}
	}

	/**
	 * Обновление IP-адреса устройства
	 *
	 * Автоматически обновляет время последнего изменения
	 *
	 * @param id - Уникальный идентификатор устройства
	 * @param ipAddress - Новый IP-адрес
	 * @returns Promise<Device> - Обновленное устройство
	 *
	 * @throws {Error} Если устройство не найдено
	 *
	 * @example
	 * ```typescript
	 * const updatedDevice = await deviceService.updateIpAddress(
	 *   'device-id',
	 *   '192.168.1.100'
	 * )
	 * ```
	 */
	async updateIpAddress(id: string, ipAddress: string): Promise<Device> {
		return await this.model.update({
			where: { id },
			data: {
				ipAddress,
				lastUpdate: new Date()
			}
		})
	}

	/**
	 * Поиск устройства по IP-адресу
	 *
	 * @param ipAddress - IP-адрес для поиска
	 * @returns Promise<Device | null> - Найденное устройство или null
	 *
	 * @example
	 * ```typescript
	 * const device = await deviceService.findByIpAddress('192.168.1.100')
	 * if (device) {
	 *   console.log(`Устройство найдено: ${device.name}`)
	 * }
	 * ```
	 */
	async findByIpAddress(ipAddress: string): Promise<Device | null> {
		return await this.model.findFirst({
			where: { ipAddress }
		})
	}

	/**
	 * Получение всех устройств определенного отдела
	 *
	 * @param departmentId - Идентификатор отдела
	 * @returns Promise<Device[]> - Массив устройств отдела, отсортированный по имени
	 *
	 * @example
	 * ```typescript
	 * const departmentDevices = await deviceService.findByLocation('dept-123')
	 * console.log(`В отделе ${departmentDevices.length} устройств`)
	 * ```
	 */
	async findByLocation(departmentId: string): Promise<Device[]> {
		return await this.model.findMany({
			where: { departmentId },
			orderBy: { name: 'asc' }
		})
	}

	/**
	 * Получение всех активных устройств
	 *
	 * Возвращает только устройства со статусом 'ACTIVE',
	 * отсортированные по времени последнего обновления
	 *
	 * @returns Promise<Device[]> - Массив активных устройств
	 *
	 * @example
	 * ```typescript
	 * const activeDevices = await deviceService.findActiveDevices()
	 * console.log(`Активных устройств: ${activeDevices.length}`)
	 * ```
	 */
	async findActiveDevices(): Promise<Device[]> {
		return await this.model.findMany({
			where: { status: 'ACTIVE' },
			orderBy: { lastUpdate: 'desc' }
		})
	}

	/**
	 * Обновление статуса устройства
	 *
	 * Автоматически обновляет время последнего изменения
	 *
	 * @param id - Уникальный идентификатор устройства
	 * @param status - Новый статус устройства
	 * @returns Promise<Device> - Обновленное устройство
	 *
	 * @throws {Error} Если устройство не найдено
	 *
	 * @example
	 * ```typescript
	 * await deviceService.updateStatus('device-id', 'INACTIVE')
	 * ```
	 */
	async updateStatus(id: string, status: DeviceStatus): Promise<Device> {
		return await this.model.update({
			where: { id },
			data: {
				status,
				lastUpdate: new Date()
			}
		})
	}

	/**
	 * Обновление времени последней активности устройства
	 *
	 * Используется для отслеживания онлайн-статуса устройств.
	 * Обновляет как lastSeen, так и lastUpdate
	 *
	 * @param id - Уникальный идентификатор устройства
	 * @returns Promise<Device> - Обновленное устройство
	 *
	 * @throws {Error} Если устройство не найдено
	 *
	 * @example
	 * ```typescript
	 * // Отметить устройство как активное
	 * await deviceService.updateLastSeen('device-id')
	 * ```
	 */
	async updateLastSeen(id: string): Promise<Device> {
		return await this.model.update({
			where: { id },
			data: {
				lastSeen: new Date(),
				lastUpdate: new Date()
			}
		})
	}

	/**
	 * Создание нового устройства
	 *
	 * Переопределяет базовый метод create для автоматического
	 * добавления временных меток lastUpdate и lastSeen
	 *
	 * @param data - Данные для создания устройства
	 * @returns Promise<Device> - Созданное устройство
	 *
	 * @throws {Error} Если данные невалидны или agentKey уже существует
	 *
	 * @example
	 * ```typescript
	 * const newDevice = await deviceService.create({
	 *   name: 'Рабочая станция 1',
	 *   ipAddress: '192.168.1.100',
	 *   agentKey: 'unique-agent-key',
	 *   type: 'WINDOWS'
	 * })
	 * ```
	 */
	async create(data: IDeviceCreateInput): Promise<Device> {
		return await this.model.create({
			data: {
				...data,
				lastUpdate: new Date(),
				lastSeen: new Date()
			}
		})
	}

	/**
	 * Удаление устройства
	 *
	 * Выполняет проверку существования устройства перед удалением
	 *
	 * @param id - Уникальный идентификатор устройства
	 * @returns Promise<Device> - Удаленное устройство
	 *
	 * @throws {Error} Если устройство не найдено
	 *
	 * @example
	 * ```typescript
	 * try {
	 *   const deletedDevice = await deviceService.deleteDevice('device-id')
	 *   console.log(`Устройство ${deletedDevice.name} удалено`)
	 * } catch (error) {
	 *   console.error('Устройство не найдено')
	 * }
	 * ```
	 */
	async deleteDevice(id: string): Promise<Device> {
		const device = await this.model.findUnique({
			where: { id },
			include: {
				inventoryItems: true,
				events: true
			}
		})

		if (!device) {
			throw new Error('Device not found')
		}

		// Используем существующий this.prisma из BaseRepository
		return await this.prisma.$transaction(async tx => {
			// 1. Удаляем связанные записи инвентаризации
			if (device.inventoryItems.length > 0) {
				await tx.inventoryItem.deleteMany({
					where: { deviceId: id }
				})
			}

			// 2. Обнуляем deviceId в событиях (сохраняем историю)
			if (device.events.length > 0) {
				await tx.event.updateMany({
					where: { deviceId: id },
					data: { deviceId: null }
				})
			}

			// 3. Удаляем устройство
			// Связи с Employee и Department автоматически обнулятся (ON DELETE SET NULL)
			return await tx.device.delete({
				where: { id }
			})
		})
	}

	/**
	 * Получение статуса устройства
	 *
	 * Определяет онлайн-статус на основе времени последней активности.
	 * Устройство считается онлайн, если последняя активность была
	 * менее 5 минут назад.
	 *
	 * @param id - Уникальный идентификатор устройства
	 * @returns Promise<Object> - Объект со статусом устройства
	 * @returns Promise<Object>.isOnline - Онлайн ли устройство
	 * @returns Promise<Object>.lastSeen - Время последней активности
	 * @returns Promise<Object>.status - Текущий статус устройства
	 *
	 * @throws {Error} Если устройство не найдено
	 *
	 * @example
	 * ```typescript
	 * const status = await deviceService.getDeviceStatus('device-id')
	 * if (status.isOnline) {
	 *   console.log('Устройство онлайн')
	 * } else {
	 *   console.log(`Последняя активность: ${status.lastSeen}`)
	 * }
	 * ```
	 */
	async getDeviceStatus(id: string): Promise<{
		isOnline: boolean
		lastSeen: Date | null
		status: DeviceStatus
	}> {
		const device = await this.model.findUnique({
			where: { id },
			select: {
				lastSeen: true,
				status: true
			}
		})

		if (!device) {
			throw new Error('Device not found')
		}

		// Устройство считается онлайн, если последняя активность была менее 5 минут назад
		const isOnline = device.lastSeen
			? new Date().getTime() - device.lastSeen.getTime() < 5 * 60 * 1000
			: false
		return {
			isOnline,
			lastSeen: device.lastSeen,
			status: device.status
		}
	}

	/**
	 * Массовое обновление устройств отдела
	 *
	 * Сначала сбрасывает все существующие связи устройств с отделом,
	 * затем устанавливает новые связи для указанных устройств.
	 *
	 * @param departmentId - Идентификатор отдела
	 * @param deviceIds - Массив идентификаторов устройств для привязки
	 * @returns Promise<void>
	 *
	 * @example
	 * ```typescript
	 * // Привязать устройства к отделу
	 * await deviceService.updateDepartmentDevices(
	 *   'dept-123',
	 *   ['device-1', 'device-2', 'device-3']
	 * )
	 * ```
	 */
	async updateDepartmentDevices(
		departmentId: string,
		deviceIds: string[]
	): Promise<void> {
		// Сначала сбрасываем все существующие связи
		await this.model.updateMany({
			where: { departmentId },
			data: { departmentId: null }
		})

		// Затем устанавливаем новые связи
		if (deviceIds.length > 0) {
			await this.model.updateMany({
				where: { id: { in: deviceIds } },
				data: { departmentId }
			})
		}
	}

	/**
	 * Подтверждение смены оборудования на агенте
	 *
	 * Отправляет запрос на агент мониторинга для подтверждения
	 * изменений в конфигурации оборудования. Использует базовую
	 * аутентификацию с паролем администратора.
	 *
	 * @param ipAddress - IP-адрес устройства с агентом
	 * @param agentKey - Уникальный ключ агента для обновления
	 * @param password - Пароль администратора для аутентификации
	 * @returns Promise<Object> - Результат операции
	 * @returns Promise<Object>.success - Успешность операции
	 * @returns Promise<Object>.error - Описание ошибки (если есть)
	 *
	 * @example
	 * ```typescript
	 * const result = await deviceService.confirmHardwareChange(
	 *   '192.168.1.100',
	 *   'agent-key-123',
	 *   'admin-password'
	 * )
	 *
	 * if (result.success) {
	 *   console.log('Изменения подтверждены')
	 * } else {
	 *   console.error(`Ошибка: ${result.error}`)
	 * }
	 * ```
	 */
	async confirmHardwareChange(
		ipAddress: string,
		agentKey: string,
		password: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			console.log('[CONFIRM_HARDWARE_CHANGE] Начало запроса:', {
				ipAddress,
				agentKey,
				passwordLength: password.length,
				url: `https://${ipAddress}:9183/api/update-uuid`
			})

			// Временно отключаем проверку SSL сертификатов
			const originalRejectUnauthorized =
				process.env.NODE_TLS_REJECT_UNAUTHORIZED
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

			try {
				// Создаем базовую аутентификацию (как в Postman)
				const authString = `${agentKey}:${password}`
				const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`

				console.log(
					'[CONFIRM_HARDWARE_CHANGE] Детали аутентификации:',
					{
						authString: authString,
						authHeader: authHeader,
						base64Decoded: Buffer.from(
							authHeader.replace('Basic ', ''),
							'base64'
						).toString()
					}
				)

				const requestOptions = {
					method: 'POST',
					headers: {
						Authorization: authHeader
					}
				}

				console.log('[CONFIRM_HARDWARE_CHANGE] Параметры запроса:', {
					url: `https://${ipAddress}:9183/api/update-uuid`,
					method: requestOptions.method,
					headers: requestOptions.headers,
					hasBody: false
				})

				// Отправляем HTTPS запрос на агент для обновления UUID
				const response = await fetch(
					`https://${ipAddress}:9183/api/update-uuid`,
					requestOptions
				)

				console.log('[CONFIRM_HARDWARE_CHANGE] Ответ получен:', {
					status: response.status,
					statusText: response.statusText,
					ok: response.ok,
					headers: Object.fromEntries(response.headers.entries())
				})

				// Попытаемся прочитать тело ответа для дополнительной информации
				let responseBody = ''
				try {
					responseBody = await response.text()
					console.log(
						'[CONFIRM_HARDWARE_CHANGE] Тело ответа:',
						responseBody
					)
				} catch (bodyError) {
					console.log(
						'[CONFIRM_HARDWARE_CHANGE] Не удалось прочитать тело ответа:',
						bodyError
					)
				}

				if (!response.ok) {
					console.log('[CONFIRM_HARDWARE_CHANGE] Ошибка HTTP:', {
						status: response.status,
						statusText: response.statusText,
						responseBody
					})

					// Специальная обработка ошибки неверного пароля
					if (response.status === 401 || response.status === 403) {
						console.log(
							'[CONFIRM_HARDWARE_CHANGE] Ошибка аутентификации - неверный пароль'
						)
						return {
							success: false,
							error: 'Неверный пароль агента. Проверьте правильность введенного пароля.'
						}
					}

					// Обработка других HTTP ошибок
					if (response.status === 404) {
						return {
							success: false,
							error: 'Агент мониторинга недоступен. Проверьте подключение к устройству.'
						}
					}

					if (response.status >= 500) {
						return {
							success: false,
							error: 'Внутренняя ошибка агента. Попробуйте позже или обратитесь к администратору.'
						}
					}

					// Общая обработка других ошибок
					return {
						success: false,
						error: `Ошибка связи с агентом (HTTP ${response.status}). Проверьте доступность устройства.`
					}
				}

				console.log(
					'[CONFIRM_HARDWARE_CHANGE] Успешное выполнение запроса'
				)
				return { success: true }
			} finally {
				// Обязательно восстанавливаем исходное значение
				process.env.NODE_TLS_REJECT_UNAUTHORIZED =
					originalRejectUnauthorized
			}
		} catch (error) {
			console.error('[CONFIRM_HARDWARE_CHANGE_ERROR] Общая ошибка:', {
				error,
				message:
					error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
				ipAddress,
				agentKey
			})

			// Обработка сетевых ошибок
			if (error instanceof TypeError && error.message.includes('fetch')) {
				return {
					success: false,
					error: 'Не удается подключиться к агенту мониторинга. Проверьте сетевое подключение и доступность устройства.'
				}
			}

			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Неизвестная ошибка при подтверждении изменений'
			}
		}
	}

	/**
	 * Обновление статуса гарантии устройства с созданием события
	 *
	 * @param id - ID устройства
	 * @param warrantyStatus - Новый статус гарантии
	 * @param userId - ID пользователя, выполняющего операцию
	 * @returns Promise<Device> - Обновленное устройство
	 */
	async updateWarrantyStatus(
		id: string,
		warrantyStatus: string,
		userId: string
	): Promise<Device> {
		try {
			// Получаем текущее устройство
			const currentDevice = await this.findById(id)
			if (!currentDevice) {
				throw new Error('Устройство не найдено')
			}

			// Обновляем статус гарантии
			const updatedDevice = await this.model.update({
				where: { id },
				data: { warrantyStatus },
				include: {
					department: true
				}
			})

			// Функция для форматирования даты в формате "месяц год"
			const formatWarrantyDate = (dateString: string | null): string => {
				if (!dateString) return 'не установлена'

				const date = new Date(dateString)
				const months = [
					'январь',
					'февраль',
					'март',
					'апрель',
					'май',
					'июнь',
					'июль',
					'август',
					'сентябрь',
					'октябрь',
					'ноябрь',
					'декабрь'
				]

				return `${months[date.getMonth()]} ${date.getFullYear()}`
			}

			// Создаем событие об изменении статуса гарантии
			const warrantyEndDate = warrantyStatus
				? formatWarrantyDate(warrantyStatus)
				: 'не установлена'

			await services.data.event.create({
				userId,
				type: 'DEVICE',
				severity: 'LOW',
				title: 'Изменен статус гарантии',
				message: `Статус гарантии устройства "${currentDevice.name}" изменен, окончание гарантии ${warrantyEndDate}`,
				isRead: false,
				deviceId: id,
				hardwareChangeConfirmed: false
			})

			return updatedDevice
		} catch (error) {
			console.error('[UPDATE_WARRANTY_STATUS_ERROR]:', error)
			throw error
		}
	}

	/**
	 * Обновляет данные активации устройства
	 *
	 * Записывает информацию об активации устройства, включая подпись активации,
	 * версию ключа активации и время активации. Используется для подтверждения
	 * того, что устройство было успешно активировано в системе мониторинга.
	 *
	 * @param id - Уникальный идентификатор устройства
	 * @param data - Данные активации устройства
	 * @param data.activationSig - Подпись активации (строка или null)
	 * @param data.activationKeyVer - Версия ключа активации (число или null)
	 * @param data.activatedAt - Время активации (Date, строка или null)
	 * @returns Promise<Device> - Обновленное устройство с данными активации
	 *
	 * @throws {Error} Если устройство с указанным ID не найдено
	 *
	 * @example
	 * ```typescript
	 * // Активация устройства с подписью и версией ключа
	 * const activatedDevice = await deviceService.updateActivation('device-123', {
	 *   activationSig: 'signature-hash-abc123',
	 *   activationKeyVer: 1,
	 *   activatedAt: new Date()
	 * })
	 *
	 * console.log(`Устройство ${activatedDevice.name} активировано`)
	 * ```
	 */
	async updateActivation(
		id: string,
		data: DeviceActivationUpdateInput
	): Promise<Device> {
		const { activationSig, activationKeyVer, activatedAt } = data
		return await this.model.update({
			where: { id },
			data: {
				activationSig,
				activationKeyVer,
				activatedAt:
					activatedAt instanceof Date
						? activatedAt
						: new Date(activatedAt)
			}
		})
	}

	/**
	 * Сбрасывает данные активации устройства
	 *
	 * Очищает все поля, связанные с активацией устройства, устанавливая их в null.
	 * Используется при деактивации устройства или при необходимости повторной активации.
	 * После выполнения этого метода устройство считается неактивированным.
	 *
	 * @param id - Уникальный идентификатор устройства
	 * @returns Promise<Device> - Обновленное устройство с очищенными данными активации
	 *
	 * @throws {Error} Если устройство с указанным ID не найдено
	 *
	 * @example
	 * ```typescript
	 * // Сброс активации устройства
	 * const deactivatedDevice = await deviceService.clearActivation('device-123')
	 *
	 * console.log(`Активация устройства ${deactivatedDevice.name} сброшена`)
	 * console.log('Подпись активации:', deactivatedDevice.activationSig) // null
	 * console.log('Версия ключа:', deactivatedDevice.activationKeyVer) // null
	 * console.log('Время активации:', deactivatedDevice.activatedAt) // null
	 * ```
	 */
	async clearActivation(id: string): Promise<Device> {
		return await this.model.update({
			where: { id },
			data: {
				activationSig: null,
				activationKeyVer: null,
				activatedAt: null
			}
		})
	}
}
