'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    createInventory,
    addInventoryItem,
    removeInventoryItem,
    getLatestInventory,
    getInventoryWithItems,
    getInventories,
    ActionResponse
} from '@/app/actions/inventory'
import { IInventoryItemCreateInput } from '@/services/inventory/inventory.interface'
import { Department, Inventory, Role } from '@prisma/client'

/**
 * Ключ для кэширования запросов инвентаризации
 */
export const INVENTORY_QUERY_KEY = ['inventory'] as const

// Расширяем тип Inventory для включения связанных данных
interface InventoryWithRelations extends Inventory {
    user: {
        id: string;
        name: string;
    }
    items?: any[]
    departments?: Department[]
}


interface UseInventoryReturn {
    inventories: InventoryWithRelations[]
    isLoadingInventories: boolean
    inventoriesError: Error | null
    
    latestInventory: InventoryWithRelations | null
    isLoading: boolean
    error: Error | null

    createInventory: (userId: string, departmentIds?: string[]) => Promise<string>
    addInventoryItem: (params: { inventoryId: string; item: IInventoryItemCreateInput }) => void
    addInventoryItemAsync: (params: { inventoryId: string; item: IInventoryItemCreateInput }) => Promise<any>
    removeInventoryItem: (params: { inventoryId: string; itemId: string }) => void
    getInventoryDetails: (inventoryId: string) => Promise<ActionResponse<Inventory>>

    isCreating: boolean
    isAddingItem: boolean
    isRemovingItem: boolean

    createError: Error | null
    addItemError: Error | null
    removeItemError: Error | null

    refetch: () => void
}


export function useInventory(userId?: string): UseInventoryReturn {
    const queryClient = useQueryClient()

    /**
     * Запрос всех инвентаризаций
     */
    const { 
        data: inventoriesResponse,
        isLoading: isLoadingInventories,
        error: inventoriesError
    } = useQuery({
        queryKey: [...INVENTORY_QUERY_KEY, 'all', userId],
        queryFn: async () => {
            // Получаем список инвентаризаций с элементами и связанными данными
            return await getInventories(userId);
        },
        select: (data) => {
            if (data.success && data.data) {
                return {
                    success: true,
                    data: data.data.map((inventory: any) => ({
                        ...inventory,
                        user: {
                            id: inventory.userId,
                            name: inventory.user?.name || 'Unknown'
                        },
                        items: inventory.items || [],
                        departments: inventory.departments || []
                    })) as InventoryWithRelations[]
                }
            }
            return { success: false, data: [] }
        },
        enabled: true
    })

    /**
     * Запрос последней инвентаризации пользователя
     */
    const { 
        data: latestInventoryResponse, 
        isLoading, 
        error 
    } = useQuery({
        queryKey: [...INVENTORY_QUERY_KEY, 'latest', userId],
        queryFn: () => userId ? getLatestInventory(userId) : null,
        enabled: !!userId
    })

    /**
     * Мутация для создания новой инвентаризации
     */
    const createMutation = useMutation({
        mutationFn: (params: { userId: string, departmentIds?: string[] }) => 
            createInventory(params.userId, params.departmentIds),
        onSuccess: () => {
            // Инвалидируем кэш после успешного создания
            queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
        }
    })

    /**
     * Создание новой инвентаризации с возвратом ID
     * @param userId - ID пользователя
     * @returns Promise с ID созданной инвентаризации
     */
    const createInventoryWithId = async (userId: string, departmentIds?: string[]): Promise<string> => {
        return new Promise((resolve, reject) => {
            createMutation.mutate({ userId, departmentIds}, {
                onSuccess: (data) => {
                    if (data.success && data.data) {
                        resolve(data.data.id);
                    } else {
                        reject(new Error('Не удалось создать инвентаризацию'));
                    }
                },
                onError: (error) => {
                    reject(error);
                }
            });
        });
    };

    /**
     * Мутация для асинхронного добавления устройства в инвентаризацию
     */
    const addItemMutation = useMutation({
        mutationFn: ({ inventoryId, item }: { inventoryId: string; item: IInventoryItemCreateInput }) => 
            addInventoryItem(inventoryId, item),
        onSuccess: (updatedInventory) => {
            // Обновляем все связанные запросы
            queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
            
            // Проверяем наличие данных перед обновлением кэша
            if (updatedInventory.success && updatedInventory.data) {
                queryClient.setQueryData(
                    [...INVENTORY_QUERY_KEY, 'details', updatedInventory.data.id], 
                    updatedInventory
                )
            }
        }
    })

    /**
     * Добавляет устройство в инвентаризацию и возвращает Promise с результатом
     * @param params - Параметры для добавления устройства
     * @returns Promise с результатом операции
     */
    const addInventoryItemAsync = (params: { inventoryId: string; item: IInventoryItemCreateInput }): Promise<any> => {
        return new Promise((resolve, reject) => {
            addItemMutation.mutate(params, {
                onSuccess: (data) => {
                    resolve(data);
                },
                onError: (error) => {
                    reject(error);
                }
            });
        });
    };


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
        inventories: (inventoriesResponse?.success && inventoriesResponse.data) || [],
        isLoadingInventories,
        inventoriesError,

        latestInventory: latestInventoryResponse?.success && latestInventoryResponse.data ? {
            ...latestInventoryResponse.data,
            user: {
                id: latestInventoryResponse.data.userId,
                name: latestInventoryResponse.data.user?.name || 'Unknown',
            },
            items: latestInventoryResponse.data.items || [],
            departments: latestInventoryResponse.data.departments || []
        } as InventoryWithRelations : null,
        isLoading,
        error,

        createInventory: createInventoryWithId,
        addInventoryItem: addItemMutation.mutate,
        addInventoryItemAsync,
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
