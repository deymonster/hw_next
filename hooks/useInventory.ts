'use client'

/**
 * Хук `useInventory` координирует процессы инвентаризации: получение списков,
 * создание актов, управление позициями и экспорт данных в Excel с помощью
 * React Query и серверных действий.
 */
import { Department, Device, Employee, Inventory } from '@prisma/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'

import {
	ActionResponse,
	addInventoryItem,
	createInventory,
	deleteInventory,
	getInventories,
	getInventoryWithItems,
	getLatestInventory,
	removeInventoryItem
} from '@/app/actions/inventory'
import { IInventoryItemCreateInput } from '@/services/inventory/inventory.interface'

/**
 * Ключ для кэширования запросов инвентаризации
 */
export const INVENTORY_QUERY_KEY = ['inventory'] as const

// Расширяем тип Inventory для включения связанных данных
export interface InventoryWithRelations extends Inventory {
	user: {
		id: string
		name: string
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

	createInventory: (
		userId: string,
		departmentIds?: string[]
	) => Promise<string>
	addInventoryItem: (params: {
		inventoryId: string
		item: IInventoryItemCreateInput
	}) => void
	addInventoryItemAsync: (params: {
		inventoryId: string
		item: IInventoryItemCreateInput
	}) => Promise<any>
	removeInventoryItem: (params: {
		inventoryId: string
		itemId: string
	}) => void
	getInventoryDetails: (
		inventoryId: string
	) => Promise<ActionResponse<Inventory>>
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
			return await getInventories(userId)
		},
		select: data => {
			if (data.success && data.data) {
				return {
					success: true,
					data: data.data.map((inventory: any) => ({
						...inventory,
						user: {
							id: inventory.userId,
							name: inventory.user?.name || 'Unknown'
						},
						items:
							inventory.items?.map((item: any) => {
								return {
									...item,
									device: item.device || undefined,
									employee: item.employee || undefined,
									department: item.department || undefined
								}
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
		queryFn: () => (userId ? getLatestInventory(userId) : null),
		enabled: !!userId
	})

	/**
	 * Мутация для создания новой инвентаризации
	 */
	const createMutation = useMutation({
		mutationFn: (params: { userId: string; departmentIds?: string[] }) =>
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
	const createInventoryWithId = async (
		userId: string,
		departmentIds?: string[]
	): Promise<string> => {
		return new Promise((resolve, reject) => {
			createMutation.mutate(
				{ userId, departmentIds },
				{
					onSuccess: data => {
						if (data.success && data.data) {
							resolve(data.data.id)
						} else {
							reject(
								new Error('Не удалось создать инвентаризацию')
							)
						}
					},
					onError: error => {
						reject(error)
					}
				}
			)
		})
	}

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
	const deleteInventoryAsync = (
		id: string
	): Promise<ActionResponse<void>> => {
		return new Promise((resolve, reject) => {
			deleteMutation.mutate(id, {
				onSuccess: (data: ActionResponse<void>) => resolve(data),
				onError: error => reject(error)
			})
		})
	}

	/**
	 * Мутация для асинхронного добавления устройства в инвентаризацию
	 */
	const addItemMutation = useMutation({
		mutationFn: ({
			inventoryId,
			item
		}: {
			inventoryId: string
			item: IInventoryItemCreateInput
		}) => addInventoryItem(inventoryId, item),
		onSuccess: updatedInventory => {
			// Обновляем все связанные запросы
			queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })

			// Проверяем наличие данных перед обновлением кэша
			if (updatedInventory.success && updatedInventory.data) {
				queryClient.setQueryData(
					[
						...INVENTORY_QUERY_KEY,
						'details',
						updatedInventory.data.id
					],
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
	const addInventoryItemAsync = (params: {
		inventoryId: string
		item: IInventoryItemCreateInput
	}): Promise<any> => {
		return new Promise((resolve, reject) => {
			addItemMutation.mutate(params, {
				onSuccess: data => {
					resolve(data)
				},
				onError: error => {
					reject(error)
				}
			})
		})
	}

	/**
	 * Мутация для удаления устройства из инвентаризации
	 */
	const removeItemMutation = useMutation({
		mutationFn: ({
			inventoryId,
			itemId
		}: {
			inventoryId: string
			itemId: string
		}) => removeInventoryItem(inventoryId, itemId),
		onSuccess: (_, { inventoryId }) => {
			// Инвалидируем кэш после успешного удаления
			queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
			// Инвалидируем кэш конкретной инвентаризации
			queryClient.invalidateQueries({
				queryKey: [...INVENTORY_QUERY_KEY, 'details', inventoryId]
			})
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
	const exportToExcel = async (
		inventoryId: string,
		fileName?: string
	): Promise<void> => {
		try {
			const response = await getInventoryWithItems(inventoryId)

			if (!response.success || !response.data) {
				throw new Error('Не удалось получить данные инвентаризации')
			}
                        const inventory = response.data

                        const formatDate = (
                                value: string | Date | null | undefined,
                                withTime = false
                        ): string => {
                                if (!value) {
                                        return ''
                                }

                                const date = value instanceof Date ? value : new Date(value)

                                if (Number.isNaN(date.getTime())) {
                                        return ''
                                }

                                const options: Intl.DateTimeFormatOptions = {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                }

                                if (withTime) {
                                        options.hour = '2-digit'
                                        options.minute = '2-digit'
                                }

                                return new Intl.DateTimeFormat('ru-RU', options).format(date)
                        }

                        const addMonths = (date: Date, months: number): Date => {
                                const result = new Date(date)
                                result.setMonth(result.getMonth() + months)
                                return result
                        }

                        const humanizeKey = (key: string): string =>
                                key
                                        .replace(/([A-Z])/g, ' $1')
                                        .replace(/_/g, ' ')
                                        .replace(/\s+/g, ' ')
                                        .trim()
                                        .replace(/^\w/, char => char.toUpperCase())

                        const formatHardwareEntry = (entry: unknown): string => {
                                if (!entry) {
                                        return ''
                                }

                                if (typeof entry === 'string' || typeof entry === 'number') {
                                        return String(entry)
                                }

                                if (typeof entry === 'object' && !Array.isArray(entry)) {
                                        return Object.entries(entry as Record<string, unknown>)
                                                .filter(([, value]) =>
                                                        value !== null && value !== undefined && value !== ''
                                                )
                                                .map(([key, value]) => `${humanizeKey(key)}: ${value}`)
                                                .join(', ')
                                }

                                if (Array.isArray(entry)) {
                                        return entry
                                                .map(value => formatHardwareEntry(value))
                                                .filter(Boolean)
                                                .join('\n')
                                }

                                return ''
                        }

                        const formatHardwareSpec = (value: unknown): string => {
                                if (!value) {
                                        return ''
                                }

                                if (Array.isArray(value)) {
                                        return value
                                                .map(item => formatHardwareEntry(item))
                                                .filter(Boolean)
                                                .join('\n')
                                }

                                return formatHardwareEntry(value)
                        }

                        const formatResponsible = (
                                employee?: {
                                        firstName?: string | null
                                        lastName?: string | null
                                }
                        ): string => {
                                if (!employee) {
                                        return ''
                                }

                                return [employee.lastName, employee.firstName]
                                        .filter(Boolean)
                                        .join(' ')
                        }

                        const formatContacts = (
                                employee?: {
                                        email?: string | null
                                        phone?: string | null
                                }
                        ): string => {
                                if (!employee) {
                                        return ''
                                }

                                return [employee.email, employee.phone]
                                        .filter(contact => contact && contact.trim().length > 0)
                                        .join(' / ')
                        }

                        const inventoryItems = inventory.items || []
                        const now = new Date()

                        const dataRows = inventoryItems.map(item => {
                                const purchaseDate = item.device?.purchaseDate
                                        ? new Date(item.device.purchaseDate)
                                        : null
                                const warrantyPeriod = item.device?.warrantyPeriod ?? null

                                const warrantyEndDate =
                                        purchaseDate && warrantyPeriod
                                                ? addMonths(purchaseDate, warrantyPeriod)
                                                : null

                                const warrantyStatus = warrantyEndDate
                                        ? warrantyEndDate >= now
                                                ? 'Активна'
                                                : 'Истекла'
                                        : 'Не указано'

                                return [
                                        item.id,
                                        item.device?.name ? item.device.name : 'Неизвестно',
                                        item.device?.ipAddress || '',
                                        item.device?.serialNumber || item.serialNumber || '',
                                        item.department?.name || '',
                                        formatResponsible(item.employee),
                                        item.employee?.position || '',
                                        formatContacts(item.employee),
                                        item.processor || '',
                                        formatHardwareSpec(item.motherboard),
                                        formatHardwareSpec(item.memory),
                                        formatHardwareSpec(item.storage),
                                        formatHardwareSpec(item.networkCards),
                                        formatHardwareSpec(item.videoCards),
                                        formatHardwareSpec(item.diskUsage),
                                        formatDate(purchaseDate),
                                        warrantyPeriod ?? '',
                                        formatDate(warrantyEndDate),
                                        warrantyStatus,
                                        formatDate(item.createdAt, true),
                                        formatDate(item.updatedAt, true)
                                ]
                        })

                        const departmentNames =
                                inventory.departments?.map(department => department.name).filter(Boolean) || []

                        const fallbackDepartments = Array.from(
                                new Set(
                                        inventoryItems
                                                .map(item => item.department?.name)
                                                .filter((name): name is string => Boolean(name))
                                )
                        )

                        const summaryRows: Array<[string, string]> = [
                                ['Инвентаризация ID', inventory.id],
                                ['Дата начала', formatDate(inventory.startDate)],
                                [
                                        'Дата формирования отчёта',
                                        formatDate(new Date(), true)
                                ],
                                [
                                        'Создатель инвентаризации',
                                        inventory.user?.name || inventory.userId || 'Неизвестно'
                                ],
                                [
                                        'Отделы',
                                        (departmentNames.length ? departmentNames : fallbackDepartments).join(', ') ||
                                                'Все отделы'
                                ],
                                ['Количество устройств', inventoryItems.length.toString()]
                        ]

                        const header = [
                                'ID записи',
                                'Название устройства',
                                'IP адрес',
                                'Серийный номер',
                                'Отдел',
                                'Ответственный',
                                'Должность',
                                'Контакты',
                                'Процессор',
                                'Материнская плата',
                                'Память',
                                'Хранилище',
                                'Сетевые интерфейсы',
                                'Видеокарты',
                                'Использование дисков',
                                'Дата приобретения',
                                'Срок гарантии (мес.)',
                                'Гарантия до',
                                'Статус гарантии',
                                'Дата добавления',
                                'Последнее обновление'
                        ]

                        const worksheetData: Array<Array<string | number>> = [
                                ...summaryRows,
                                [],
                                header,
                                ...dataRows
                        ]

                        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

                        const headerRowIndex = summaryRows.length + 1
                        const lastDataRowIndex = dataRows.length
                                ? headerRowIndex + dataRows.length
                                : headerRowIndex

                        worksheet['!autofilter'] = {
                                ref: XLSX.utils.encode_range({
                                        s: { c: 0, r: headerRowIndex },
                                        e: { c: header.length - 1, r: lastDataRowIndex }
                                })
                        }

                        worksheet['!freeze'] = {
                                xSplit: 0,
                                ySplit: headerRowIndex + 1,
                                topLeftCell: XLSX.utils.encode_cell({
                                        r: headerRowIndex + 1,
                                        c: 0
                                })
                        }

                        worksheet['!cols'] = [
                                { wch: 18 },
                                { wch: 28 },
                                { wch: 16 },
                                { wch: 20 },
                                { wch: 24 },
                                { wch: 24 },
                                { wch: 20 },
                                { wch: 28 },
                                { wch: 22 },
                                { wch: 26 },
                                { wch: 26 },
                                { wch: 26 },
                                { wch: 26 },
                                { wch: 22 },
                                { wch: 28 },
                                { wch: 18 },
                                { wch: 20 },
                                { wch: 18 },
                                { wch: 18 },
                                { wch: 22 },
                                { wch: 22 }
                        ]

                        const workbook = XLSX.utils.book_new()
                        XLSX.utils.book_append_sheet(workbook, worksheet, 'Инвентаризация')

                        const defaultFileName = `Инвентаризация_${formatDate(inventory.startDate)}.xlsx`

                        XLSX.writeFile(workbook, fileName || defaultFileName)
                } catch (error) {
                        console.error('Ошибка при экспорте в Excel:', error)
                        throw error
                }
        }

	return {
		exportToExcel,

		inventories:
			(inventoriesResponse?.success && inventoriesResponse.data) || [],
		isLoadingInventories,
		inventoriesError,

		latestInventory:
			latestInventoryResponse?.success && latestInventoryResponse.data
				? ({
						...latestInventoryResponse.data,
						user: {
							id: latestInventoryResponse.data.userId,
							name:
								latestInventoryResponse.data.user?.name ||
								'Unknown'
						},
						items: latestInventoryResponse.data.items || [],
						departments:
							latestInventoryResponse.data.departments || []
					} as InventoryWithRelations)
				: null,
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

		refetch: () =>
			queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
	}
}
