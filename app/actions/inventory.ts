'use server'

import { services } from "@/services"
import { IInventoryItemCreateInput } from "@/services/inventory/inventory.interface"


/**
 * Интерфейс ответа серверного действия
 * @template T - Тип возвращаемых данных
 */
interface ActionResponse<T = void> {
    success: boolean        // Флаг успешности операции
    data?: T               // Опциональные данные операции
    error?: string         // Сообщение об ошибке, если операция не удалась
}

/**
 * Создает новую инвентаризацию для указанного пользователя
 * @param userId - Идентификатор пользователя, создающего инвентаризацию
 * @returns {Promise<ActionResponse>} Объект с результатом операции и созданной инвентаризацией
 */
export async function createInventory(userId: string): Promise<ActionResponse<any>> {
    try {
        const inventory = await services.data.inventory.create({
            userId,
            startDate: new Date()
        })
        return { success: true, data: inventory }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

/**
 * Добавляет устройство в существующую инвентаризацию
 * @param inventoryId - Идентификатор инвентаризации
 * @param item - Данные устройства для добавления в инвентаризацию
 * @returns {Promise<ActionResponse>} Объект с результатом операции и добавленным устройством
 */
export async function addInventoryItem(inventoryId: string, item: IInventoryItemCreateInput): Promise<ActionResponse<any>> {
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
 * @returns {Promise<ActionResponse>} Объект с результатом операции
 */
export async function removeInventoryItem(inventoryId: string, itemId: string): Promise<ActionResponse> {
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
 * @returns {Promise<ActionResponse>} Объект с результатом операции и данными последней инвентаризации
 */
export async function getLatestInventory(userId: string): Promise<ActionResponse<any>> {
    try {
        const inventory = await services.data.inventory.getLatestInventory(userId)
        return { success: true, data: inventory }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

/**
 * Получает инвентаризацию вместе со всеми её элементами
 * @param id - Идентификатор инвентаризации
 * @returns {Promise<ActionResponse>} Объект с результатом операции и данными инвентаризации с элементами
 */
export async function getInventoryWithItems(id: string): Promise<ActionResponse<any>> {
    try {
        const inventory = await services.data.inventory.findWithItems(id)
        return { success: true, data: inventory }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}