'use server'

import { services } from '@/services'

const deviceService = services.data.device
const LICD_URL = process.env.LICD_URL || 'http://licd:8081'

/**
 * Статус лицензий в системе LICD
 * @interface LicenseStatus
 */
type LicenseStatus = {
	/** Максимальное количество агентов по лицензии */
	max_agents: number
	/** Количество активных лицензированных агентов */
	active_licensed: number
	/** Оставшееся количество доступных лицензий */
	remaining: number
}

/**
 * Получает текущий статус лицензий от сервера LICD
 *
 * Функция выполняет GET запрос к эндпоинту `/license/status` сервера LICD
 * и возвращает информацию о состоянии лицензий.
 *
 * @returns {Promise<{success: true, data: LicenseStatus} | {success: false, error: string}>}
 *   Объект с результатом операции:
 *   - При успехе: `{success: true, data: LicenseStatus}`
 *   - При ошибке: `{success: false, error: string}`
 *
 * @example
 * ```typescript
 * const result = await getLicenseStatus()
 * if (result.success) {
 *   console.log(`Доступно лицензий: ${result.data.remaining}`)
 *   console.log(`Активных агентов: ${result.data.active_licensed}`)
 *   console.log(`Максимум агентов: ${result.data.max_agents}`)
 * } else {
 *   console.error(`Ошибка: ${result.error}`)
 * }
 * ```
 *
 * @throws {Error} Возможные ошибки:
 *   - `"HTTP {status}"` - HTTP ошибка от сервера
 *   - `"Malformed status payload from licd"` - Некорректный формат ответа
 *   - `"Failed to reach licd"` - Сервер недоступен
 */
export async function getLicenseStatus(): Promise<
	{ success: true; data: LicenseStatus } | { success: false; error: string }
> {
	try {
		const r = await fetch(`${LICD_URL}/license/status`, {
			cache: 'no-store'
		})
		if (!r.ok) {
			return { success: false, error: `HTTP ${r.status}` }
		}
		const data = (await r.json()) as LicenseStatus
		if (
			typeof data?.max_agents !== 'number' ||
			typeof data?.active_licensed !== 'number' ||
			typeof data?.remaining !== 'number'
		) {
			return {
				success: false,
				error: 'Malformed status payload from licd'
			}
		}
		return { success: true, data }
	} catch (e) {
		console.error('[LICD][STATUS] error:', e)
		return { success: false, error: 'Failed to reach licd' }
	}
}

/**
 * Параметры для активации устройства
 * @interface ActivateDeviceParams
 */
interface ActivateDeviceParams {
	/** Уникальный идентификатор устройства */
	deviceId: string
	/** Ключ агента для активации */
	agentKey: string
	ipAddress: string
	/** Порт устройства (по умолчанию 9182) */
	port?: number
	/** Идентификатор арендатора (опционально) */
	tenantId?: string
}

/**
 * Активирует устройство в системе лицензирования LICD
 *
 * Функция отправляет POST запрос к эндпоинту `/license/activate` для активации
 * устройства с указанными параметрами. При успешной активации обновляет
 * данные устройства в локальной базе данных.
 *
 * @param {ActivateDeviceParams} params - Параметры активации
 * @param {string} params.deviceId - Уникальный идентификатор устройства
 * @param {string} params.agentKey - Ключ агента для активации
 * @param {string} [params.tenantId] - Идентификатор арендатора (опционально)
 *
 * @returns {Promise<{success: true} | {success: false, reason: string}>}
 *   Объект с результатом операции:
 *   - При успехе: `{success: true}`
 *   - При ошибке: `{success: false, reason: string}`
 *
 * @example
 * ```typescript
 * const result = await activateDevice({
 *   deviceId: "device-123",
 *   agentKey: "agent-key-456",
 *   tenantId: "tenant-789"
 * })
 *
 * if (result.success) {
 *   console.log("Устройство успешно активировано")
 * } else {
 *   switch (result.reason) {
 *     case "limit_reached":
 *       console.error("Достигнут лимит лицензий")
 *       break
 *     case "forbidden":
 *       console.error("Доступ запрещен")
 *       break
 *     case "licd_unreachable":
 *       console.error("Сервер лицензирования недоступен")
 *       break
 *     default:
 *       console.error(`Ошибка активации: ${result.reason}`)
 *   }
 * }
 * ```
 *
 * @throws {Error} Возможные причины ошибок:
 *   - `"limit_reached"` - Достигнут лимит лицензий (HTTP 409)
 *   - `"forbidden"` - Доступ запрещен (HTTP 403)
 *   - `"HTTP_{status}"` - Другие HTTP ошибки
 *   - `"licd_unreachable"` - Сервер недоступен
 *   - Кастомные причины от сервера в поле `reason`
 *
 * @description
 * Внутренняя логика функции:
 * 1. Отправляет POST запрос на `/license/activate` с параметрами активации
 * 2. При успешном ответе получает данные активации:
 *    - `activationSig` - Подпись активации
 *    - `keyVer` - Версия ключа
 *    - `activatedAt` - Время активации (ISO string)
 * 3. Обновляет данные устройства через `deviceService.updateActivation()`
 * 4. Возвращает результат операции
 *
 * @note Все запросы используют `cache: 'no-store'` для получения актуальных данных
 */
export async function activateDevice(
	params: ActivateDeviceParams
): Promise<{ success: true } | { success: false; reason: string }> {
	try {
		const r = await fetch(`${LICD_URL}/license/activate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			cache: 'no-store',
			body: JSON.stringify({
				deviceId: params.deviceId,
				agentKey: params.agentKey,
				ipAddress: params.ipAddress,
				port: params.port ?? 9182,
				tenantId: params.tenantId
			})
		})

		const body = await r.json().catch(() => ({}) as any)

		if (!r.ok || !body?.ok) {
			const reason: string =
				body?.reason ||
				(r.status === 409
					? 'limit_reached'
					: r.status === 403
						? 'forbidden'
						: `HTTP_${r.status}`)
			return { success: false, reason }
		}

		// ожидается: { ok: true, activationSig, keyVer, activatedAt }
		await deviceService.updateActivation(params.deviceId, {
			activationSig: String(body.activationSig),
			activationKeyVer: Number(body.keyVer),
			activatedAt: body.activatedAt ?? new Date().toISOString()
		})

		return { success: true }
	} catch (e) {
		console.error('[LICD][ACTIVATE] error:', e)
		return { success: false, reason: 'licd_unreachable' }
	}
}

/**
 * @fileoverview
 * Модуль для работы с системой лицензирования LICD (License Control Daemon)
 *
 * Этот файл содержит серверные действия (Server Actions) для Next.js приложения,
 * которые обеспечивают взаимодействие с сервером лицензирования LICD.
 *
 * @module licd.actions
 * @version 1.0.0
 * @author HW Monitor Team
 *
 * @requires @/services - Сервисы приложения для работы с устройствами
 * @requires next/server - Next.js Server Actions (директива 'use server')
 *
 * @environment
 * - LICD_URL - URL сервера LICD (по умолчанию: http://licd:8081)
 *
 * @description
 * Модуль предоставляет следующую функциональность:
 * - Получение статуса лицензий
 * - Активация устройств в системе лицензирования
 * - Обработка ошибок и валидация данных
 * - Логирование операций
 *
 * @security
 * - Все запросы проходят валидацию ответов
 * - Обработка различных типов HTTP ошибок
 * - Graceful handling недоступности сервера
 * - Валидация структуры данных в ответах
 *
 * @logging
 * Ошибки логируются в консоль с префиксами:
 * - [LICD][STATUS] - для ошибок получения статуса
 * - [LICD][ACTIVATE] - для ошибок активации
 */

/**
 * Параметры для batch активации устройств
 */
interface BatchActivateDeviceParams {
	devices: {
		deviceId: string
		agentKey: string
		ipAddress: string
		port?: number
		tenantId?: string
	}[]
}

/**
 * Результат batch активации
 */
interface BatchActivateResult {
	deviceId: string
	ipAddress: string
	success: boolean
	device?: any
	error?: string
}

/**
 * Активирует несколько устройств одновременно в системе лицензирования LICD
 */
export async function activateBatchDevices(
	params: BatchActivateDeviceParams
): Promise<{
	success: boolean
	successCount: number
	totalCount: number
	results: BatchActivateResult[]
	reason?: string
}> {
	try {
		const requestBody = {
			devices: params.devices.map(device => ({
				deviceId: device.deviceId,
				agentKey: device.agentKey,
				ipAddress: device.ipAddress,
				port: device.port ?? 9182,
				tenantId: device.tenantId
			}))
		}

		const r = await fetch(`${LICD_URL}/license/activate-batch`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			cache: 'no-store',
			body: JSON.stringify(requestBody)
		})

		const body = await r.json().catch(() => ({}) as any)

		if (!r.ok || !body?.ok) {
			const reason: string =
				body?.reason ||
				(r.status === 409
					? 'limit_reached'
					: r.status === 403
						? 'forbidden'
						: `HTTP_${r.status}`)
			return {
				success: false,
				successCount: 0,
				totalCount: params.devices.length,
				results: [],
				reason
			}
		}

		// Обновляем активацию для успешно активированных устройств
		for (const result of body.results) {
			if (result.success && result.device) {
				try {
					await deviceService.updateActivation(result.deviceId, {
						activationSig: String(
							result.device.activationSig || 'batch-activated'
						),
						activationKeyVer: Number(result.device.keyVer || 1),
						activatedAt:
							result.device.activatedAt ??
							new Date().toISOString()
					})
				} catch (updateError) {
					console.error(
						`[LICD][BATCH] Failed to update device ${result.deviceId}:`,
						updateError
					)
				}
			}
		}

		return {
			success: true,
			successCount: body.success_count,
			totalCount: body.total_count,
			results: body.results
		}
	} catch (e) {
		console.error('[LICD][BATCH] error:', e)
		return {
			success: false,
			successCount: 0,
			totalCount: params.devices.length,
			results: [],
			reason: 'licd_unreachable'
		}
	}
}
