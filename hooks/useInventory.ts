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
import { Department, Inventory, Role, User } from '@prisma/client'

/**
 * Ключ для кэширования запросов инвентаризации
 */
export const INVENTORY_QUERY_KEY = ['inventory'] as const

// Расширяем тип Inventory для включения связанных данных
interface InventoryWithRelations extends Inventory {
    user: {
        id: string;
        name: string;
        // Делаем остальные поля опциональными
        createdAt?: Date;
        updatedAt?: Date;
        email?: string;
        password?: string;
        role?: Role;
        emailVerified?: boolean;
        verificationToken?: string | null;
        resetToken?: string | null;
        resetTokenExpires?: Date | null;
        image?: string | null;
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

    createInventory: (userId: string) => void
    addInventoryItem: (params: { inventoryId: string; item: IInventoryItemCreateInput }) => void
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
        queryFn: () => getInventories(userId),
        select: (data) => {
            if (data.success && data.data) {
                return {
                    success: true,
                    data: data.data.map(inventory => ({
                        ...inventory,
                        user: {
                            id: inventory.userId,
                            name: inventory.user?.name || 'Unknown',
                            // Добавляем опциональные поля с undefined
                            createdAt: undefined,
                            updatedAt: undefined,
                            email: undefined,
                            password: undefined,
                            role: undefined,
                            emailVerified: undefined,
                            verificationToken: undefined,
                            resetToken: undefined,
                            resetTokenExpires: undefined,
                            image: undefined
                        },
                        items: [],
                        departments: []
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

        latestInventory: (latestInventoryResponse?.success && latestInventoryResponse.data) || null,
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
