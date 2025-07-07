'use server'

import {
	Department,
	Device,
	Employee,
	Inventory as PrismaInventory,
	InventoryItem as PrismaInventoryItem,
	User
} from '@prisma/client'

import { services } from '@/services'
import { IInventoryItemCreateInput } from '@/services/inventory/inventory.interface'

/**
 * Интерфейс инвентаризации с расширенными данными
 */
interface Inventory extends PrismaInventory {
	items: (PrismaInventoryItem & {
		device?: Device
		employee?: Employee
		department?: Department
	})[]
	user: User
	departments: Department[]
}

/**
 * Интерфейс ответа серверного действия
 * @template T - Тип возвращаемых данных
 */
export interface ActionResponse<T = void> {
	success: boolean // Флаг успешности операции
	data?: T // Опциональные данные операции
	error?: string // Сообщение об ошибке, если операция не удалась
}

/**
 * Создает новую инвентаризацию для указанного пользователя
 * @param userId - Идентификатор пользователя, создающего инвентаризацию
 * @returns {Promise<ActionResponse<Inventory>>} Объект с результатом операции и созданной инвентаризацией
 */
export async function createInventory(
	userId: string,
	departmentIds?: string[]
): Promise<ActionResponse<Inventory>> {
	if (!userId) {
		return { success: false, error: 'ID пользователя обязателен' }
	}

	try {
		const inventory = await services.data.inventory.create({
			userId,
			startDate: new Date(),
			departments: departmentIds
				? {
						connect: departmentIds.map(id => ({ id }))
					}
				: undefined
		})
		return { success: true, data: inventory as Inventory }
	} catch (error) {
		return { success: false, error: (error as Error).message }
	}
}

/**
 * Добавляет устройство в существующую инвентаризацию
 * @param inventoryId - Идентификатор инвентаризации
 * @param item - Данные устройства для добавления в инвентаризацию
 * @returns {Promise<ActionResponse<PrismaInventoryItem>>} Объект с результатом операции и добавленным устройством
 */
export async function addInventoryItem(
	inventoryId: string,
	item: IInventoryItemCreateInput
): Promise<ActionResponse<PrismaInventoryItem>> {
	if (!inventoryId || !item.deviceId) {
		return {
			success: false,
			error: 'ID инвентаризации и устройства обязательны'
		}
	}
	try {
		const newItem = await services.data.inventory.addItem(inventoryId, item)
		return { success: true, data: newItem }
	} catch (error) {
		return { success: false, error: (error as Error).message }
	}
}

/**
 * Удаляет устройство из инвентаризации
 * @param inventoryId - Идентификатор инвентаризации
 * @param itemId - Идентификатор устройства для удаления
 * @returns {Promise<ActionResponse<void>>} Объект с результатом операции
 */
export async function removeInventoryItem(
	inventoryId: string,
	itemId: string
): Promise<ActionResponse> {
	try {
		await services.data.inventory.removeItem(inventoryId, itemId)
		return { success: true }
	} catch (error) {
		return { success: false, error: (error as Error).message }
	}
}

/**
 * Получает последнюю инвентаризацию пользователя
 * @param userId - Идентификатор пользователя
 * @returns {Promise<ActionResponse<Inventory | null>>} Объект с результатом операции и данными последней инвентаризации
 */
export async function getLatestInventory(
	userId: string
): Promise<ActionResponse<Inventory | null>> {
	if (!userId) {
		return { success: false, error: 'ID пользователя обязателен' }
	}
	try {
		const inventory =
			await services.data.inventory.getLatestInventory(userId)
		return { success: true, data: inventory as Inventory | null }
	} catch (error) {
		return { success: false, error: (error as Error).message }
	}
}

/**
 * Получает инвентаризацию вместе со всеми её элементами
 * @param id - Идентификатор инвентаризации
 * @returns {Promise<ActionResponse<Inventory>>} Объект с результатом операции и данными инвентаризации с элементами
 */
export async function getInventoryWithItems(
	id: string
): Promise<ActionResponse<Inventory>> {
	if (!id) {
		return { success: false, error: 'ID инвентаризации обязателен' }
	}
	try {
		const inventory = await services.data.inventory.findWithItems(id)
		return { success: true, data: inventory as Inventory }
	} catch (error) {
		return { success: false, error: (error as Error).message }
	}
}

/**
 * Получает список всех инвентаризаций c элементами
 * @param userId - Опциональный идентификатор пользователя для фильтрации
 * @returns {Promise<ActionResponse<Inventory[]>>} Объект с результатом операции и списком инвентаризаций
 */
export async function getInventories(
	userId?: string
): Promise<ActionResponse<Inventory[]>> {
	try {
		const inventories = await services.data.inventory.findAllWithItems({
			where: userId ? { userId } : undefined,
			orderBy: { startDate: 'desc' },
			include: {
				items: {
					include: {
						device: true,
						employee: true,
						department: true
					}
				},
				user: true,
				departments: true
			}
		})

		return { success: true, data: inventories as Inventory[] }
	} catch (error) {
		return { success: false, error: (error as Error).message }
	}
}

/**
 * Удаляет объект инвентаризации со всеми связанными items
 * @param inventoryId - Идентификатор инвентаризации
 * @returns {Promise<ActionResponse<void>>} Объект с результатом операции
 */
export async function deleteInventory(
	inventoryId: string
): Promise<ActionResponse<void>> {
	try {
		await services.data.inventory.delete(inventoryId)
		return { success: true }
	} catch (error) {
		console.error('Error deleting inventory:', error)
		return { success: false, error: (error as Error).message }
	}
}
