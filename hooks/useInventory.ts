'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    createInventory,
    addInventoryItem,
    removeInventoryItem,
    getLatestInventory,
    getInventoryWithItems,
    getInventories,
    ActionResponse,
    deleteInventory
} from '@/app/actions/inventory'
import { IInventoryItemCreateInput } from '@/services/inventory/inventory.interface'
import { Department, Device, Employee, Inventory } from '@prisma/client'
import * as XLSX from 'xlsx'

/**
 * Ключ для кэширования запросов инвентаризации
 */
export const INVENTORY_QUERY_KEY = ['inventory'] as const

// Расширяем тип Inventory для включения связанных данных
export interface InventoryWithRelations extends Inventory {
    user: {
        id: string;
        name: string;
    }
    items?: (any & {
        device?: Device
        employee?: Employee
        department?: Department
    })[]
    departments?: Department[]
}


interface UseInventoryReturn {
    inventories: InventoryWithRelations[]
    isLoadingInventories: boolean
    inventoriesError: Error | null

    deleteInventory: (id: string) => void
    deleteInventoryAsync: (id: string) => Promise<ActionResponse<void>>
    isDeleting: boolean
    deleteError: Error | null
    
    latestInventory: InventoryWithRelations | null
    isLoading: boolean
    error: Error | null

    createInventory: (userId: string, departmentIds?: string[]) => Promise<string>
    addInventoryItem: (params: { inventoryId: string; item: IInventoryItemCreateInput }) => void
    addInventoryItemAsync: (params: { inventoryId: string; item: IInventoryItemCreateInput }) => Promise<any>
    removeInventoryItem: (params: { inventoryId: string; itemId: string }) => void
    getInventoryDetails: (inventoryId: string) => Promise<ActionResponse<Inventory>>
    exportToExcel: (inventoryId: string, fileName?: string) => Promise<void>

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
                        items: inventory.items?.map((item: any) => {
                            
                            return {
                                ...item,
                                device: item.device || undefined,
                                employee: item.employee || undefined,
                                department: item.department || undefined
                            };
                        }) || [],
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
    * Мутация для удаления инвентаризации
    */
    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteInventory(id),
        onSuccess: (_, deletedId) => {
            // Инвалидируем общий кэш инвентаризаций
            queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
            
            // Удаляем кэш конкретной инвентаризации
            queryClient.removeQueries({ 
                queryKey: [...INVENTORY_QUERY_KEY, 'details', deletedId]
            })

            // Если удаляется инвентаризация текущего пользователя,
            // инвалидируем кэш последней инвентаризации
            if (userId) {
                queryClient.invalidateQueries({ 
                    queryKey: [...INVENTORY_QUERY_KEY, 'latest', userId]
                })
            }
        }
    })

    /**
     * Асинхронное удаление инвентаризации с возвратом результата
     */
    const deleteInventoryAsync = (id: string): Promise<ActionResponse<void>> => {
        return new Promise((resolve, reject) => {
            deleteMutation.mutate(id, {
                onSuccess: (data: ActionResponse<void>) => resolve(data),
                onError: (error) => reject(error)
            })
        })
    }


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

    /**
     * Экспортирует данные инвентаризации в Excel файл
     * @param inventoryId - Идентификатор инвентаризации
     * @param fileName - Имя файла (опционально)
     */
    const exportToExcel = async (inventoryId: string, fileName?: string): Promise<void> => {
        try {
            const response = await getInventoryWithItems(inventoryId)

            if (!response.success || !response.data) {
                throw new Error('Не удалось получить данные инвентаризации')
            }
            const inventory = response.data

            const inventoryItems = inventory.items?.map(item =>{
                const motherboard = item.motherboard ? JSON.stringify(item.motherboard) : ''
                const memory = item.memory ? JSON.stringify(item.memory) : ''
                const storage = item.storage ? JSON.stringify(item.storage) : ''
                const networkCards = item.networkCards ? JSON.stringify(item.networkCards) : ''
                const videoCards = item.videoCards ? JSON.stringify(item.videoCards) : ''
                const diskUsage = item.diskUsage ? JSON.stringify(item.diskUsage) : ''

                return {
                    'ID устройства': item.id,
                    'Название': item.device?.name ? item.device.name : 'Неизвестно',
                    'IP адрес': item.device?.ipAddress || '',
                    'Серийный номер': item.device?.serialNumber || '',
                    'Процессор': item.processor || '',
                    'Материнская плата': motherboard,
                    'Память': memory,
                    'Хранилище': storage,
                    'Сетевые карты': networkCards,
                    'Видеокарты': videoCards,
                    'Использование диска': diskUsage,
                    'Сотрудник': item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : '',
                    'Отдел': item.department?.name || '',
                    'Дата создания': new Date(item.createdAt).toLocaleString(),
                    'Дата обновления': new Date(item.updatedAt).toLocaleString()
                }
            }) || []

            // Создаем рабочую книгу Excel
            const worksheet = XLSX.utils.json_to_sheet(inventoryItems)
            const workbook = XLSX.utils.book_new()

            // Добавляем лист с данными
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Инвентаризация')
            
            // Формируем имя файла
            const defaultFileName = `Инвентаризация_${new Date(inventory.startDate).toLocaleDateString()}.xlsx`
            
            // Сохраняем файл
            XLSX.writeFile(workbook, fileName || defaultFileName)

        } catch (error) {
            console.error('Ошибка при экспорте в Excel:', error)
            throw error
        }
    }

    return {
        exportToExcel,

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

        deleteInventory: deleteMutation.mutate,
        deleteInventoryAsync,
        isDeleting: deleteMutation.isPending,
        deleteError: deleteMutation.error,

        isCreating: createMutation.isPending,
        isAddingItem: addItemMutation.isPending,
        isRemovingItem: removeItemMutation.isPending,

        createError: createMutation.error,
        addItemError: addItemMutation.error,
        removeItemError: removeItemMutation.error,
        
        refetch: () => queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
    }
}
