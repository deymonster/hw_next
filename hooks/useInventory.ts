'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    createInventory,
    addInventoryItem,
    removeInventoryItem,
    getLatestInventory,
    getInventoryWithItems
} from '@/app/actions/inventory'
import { IInventoryItemCreateInput } from '@/services/inventory/inventory.interface'

/**
 * Ключ для кэширования запросов инвентаризации
 */
export const INVENTORY_QUERY_KEY = ['inventory'] as const

/**
 * Хук для управления инвентаризацией
 * @param userId - Идентификатор пользователя (опционально)
 * @returns {Object} Объект с методами и состоянием для работы с инвентаризацией
 * 
 * @property {Object} latestInventory - Последняя инвентаризация пользователя
 * @property {boolean} isLoading - Флаг загрузки данных
 * @property {Error} error - Ошибка при загрузке данных
 * 
 * @property {Function} createInventory - Создание новой инвентаризации
 * @property {Function} addInventoryItem - Добавление устройства в инвентаризацию
 * @property {Function} removeInventoryItem - Удаление устройства из инвентаризации
 * @property {Function} getInventoryDetails - Получение детальной информации об инвентаризации
 * 
 * @property {boolean} isCreating - Флаг создания инвентаризации
 * @property {boolean} isAddingItem - Флаг добавления устройства
 * @property {boolean} isRemovingItem - Флаг удаления устройства
 * 
 * @property {Error} createError - Ошибка при создании инвентаризации
 * @property {Error} addItemError - Ошибка при добавлении устройства
 * @property {Error} removeItemError - Ошибка при удалении устройства
 * 
 * @property {Function} refetch - Обновление данных инвентаризации
 */
export function useInventory(userId?: string) {
    const queryClient = useQueryClient()

    /**
     * Запрос последней инвентаризации пользователя
     */
    const { data: latestInventory = null, isLoading, error } = useQuery({
        queryKey: [...INVENTORY_QUERY_KEY, 'latest', userId],
        queryFn: () => userId ? getLatestInventory(userId) : null,
        enabled: !!userId
    })

    /**
     * Мутация для создания новой инвентаризации
     */
    const createMutation = useMutation({
        mutationFn: (userId: string) => createInventory(userId),
        onSuccess: () => {
            // Инвалидируем кэш после успешного создания
            queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
        }
    })

    /**
     * Мутация для добавления устройства в инвентаризацию
     */
    const addItemMutation = useMutation({
        mutationFn: ({ inventoryId, item }: { inventoryId: string; item: IInventoryItemCreateInput }) => 
            addInventoryItem(inventoryId, item),
        onSuccess: (updatedInventory) => {
            // Обновляем все связанные запросы
            queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
            
            // Обновляем кэш для конкретной инвентаризации
            queryClient.setQueryData([...INVENTORY_QUERY_KEY, 'details', updatedInventory.data.id], updatedInventory)
        }
    })

    /**
     * Мутация для удаления устройства из инвентаризации
     */
    const removeItemMutation = useMutation({
        mutationFn: ({ inventoryId, itemId }: { inventoryId: string; itemId: string }) => 
            removeInventoryItem(inventoryId, itemId),
        onSuccess: (_, { inventoryId }) => {
            // Инвалидируем кэш после успешного удаления
            queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
            // Инвалидируем кэш конкретной инвентаризации
            queryClient.invalidateQueries({ queryKey: [...INVENTORY_QUERY_KEY, 'details', inventoryId] })
        }
    })

    /**
     * Получение детальной информации об инвентаризации
     * @param inventoryId - Идентификатор инвентаризации
     */
    const getInventoryDetails = async (inventoryId: string) => {
        return await getInventoryWithItems(inventoryId)
    }

    return {
        latestInventory,
        isLoading,
        error,

        createInventory: createMutation.mutate,
        addInventoryItem: addItemMutation.mutate,
        removeInventoryItem: removeItemMutation.mutate,
        getInventoryDetails,

        isCreating: createMutation.isPending,
        isAddingItem: addItemMutation.isPending,
        isRemovingItem: removeItemMutation.isPending,

        createError: createMutation.error,
        addItemError: addItemMutation.error,
        removeItemError: removeItemMutation.error,
        
        refetch: () => queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
    }
}
