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

			const parseSizeToGb = (raw: unknown): number | undefined => {
				if (raw === null || raw === undefined) {
					return undefined
				}

				if (typeof raw === 'number') {
					if (Number.isNaN(raw) || raw <= 0) {
						return undefined
					}
					return Number(raw.toFixed(2))
				}

				if (typeof raw !== 'string' || raw.trim().length === 0) {
					return undefined
				}

				const numericValue = Number(raw)
				if (!Number.isNaN(numericValue) && numericValue > 0) {
					if (numericValue > 1024 * 1024 * 1024) {
						return Number(
							(numericValue / (1024 * 1024 * 1024)).toFixed(2)
						)
					}
					return Number(numericValue.toFixed(2))
				}

				const match = raw.match(/([\d.,]+)/)
				if (!match) {
					return undefined
				}

				const parsed = Number(match[1].replace(',', '.'))
				if (Number.isNaN(parsed)) {
					return undefined
				}

				if (/tb/i.test(raw)) {
					return Number((parsed * 1024).toFixed(2))
				}

				return Number(parsed.toFixed(2))
			}

			const formatMotherboard = (
				entry: Record<string, unknown>
			): string | null => {
				const manufacturer = (entry.manufacturer || entry.vendor) as
					| string
					| undefined
				const product = entry.product as string | undefined
				const serial = (entry.serialNumber || entry.serial_number) as
					| string
					| undefined
				const version = entry.version as string | undefined

				const base = [manufacturer, product]
					.filter(Boolean)
					.join(' ')
					.trim()

				const extra = [
					serial ? `S/N ${serial}` : null,
					version ? `Ver. ${version}` : null
				].filter(Boolean)

				const parts = [...(base ? [base] : []), ...extra]
				return parts.length ? parts.join(' ') : null
			}

			const formatMemoryModule = (
				entry: Record<string, unknown>
			): string | null => {
				const capacity = entry.capacity as string | undefined
				const type = (entry.type ||
					entry.memoryType ||
					entry.memory_type) as string | undefined
				const speed = entry.speed as string | undefined
				const base = [capacity, type, speed]
					.filter(Boolean)
					.join(' ')
					.trim()

				const serial = (entry.serialNumber || entry.serial_number) as
					| string
					| undefined
				const partNumber = (entry.partNumber || entry.part_number) as
					| string
					| undefined

				const extra = [
					serial ? `S/N ${serial}` : null,
					partNumber ? `P/N ${partNumber}` : null
				].filter(Boolean)

				const sections = [...(base ? [base] : []), ...extra]
				return sections.length ? sections.join(' • ') : null
			}

			const formatGpu = (
				entry: Record<string, unknown>
			): string | null => {
				const name = entry.name as string | undefined
				const memoryGB = Number(entry.memoryGB)
				const memoryMB = Number(
					entry.memoryMB ?? (entry.memory as any)?.total
				)

				let memoryLabel: string | null = null
				if (!Number.isNaN(memoryGB) && memoryGB > 0) {
					memoryLabel = `${memoryGB.toFixed(2)} ГБ`
				} else if (!Number.isNaN(memoryMB) && memoryMB > 0) {
					if (memoryMB >= 1024) {
						memoryLabel = `${(memoryMB / 1024).toFixed(2)} ГБ`
					} else {
						memoryLabel = `${memoryMB.toFixed(0)} МБ`
					}
				}

				const parts = [name, memoryLabel ? `(${memoryLabel})` : null]
					.filter(Boolean)
					.join(' ')

				return parts.length ? parts : null
			}

			const formatDisk = (
				entry: Record<string, unknown>
			): string | null => {
				const model = (entry.model || entry.name || entry.id) as
					| string
					| undefined
				const sizeGbValue = parseSizeToGb(entry.sizeGb ?? entry.size)
				const sizeLabel =
					typeof sizeGbValue === 'number'
						? `${sizeGbValue.toFixed(2)} ГБ`
						: (entry.size as string | undefined)
				const type = entry.type as string | undefined
				const health = entry.health as string | undefined

				const meta = [
					sizeLabel,
					type ? `Тип: ${type}` : null,
					health ? `Состояние: ${health}` : null
				].filter((value): value is string => Boolean(value))

				const lines = [
					model ? `Модель: ${model}` : null,
					meta.length ? meta.join(' • ') : null
				].filter((value): value is string => Boolean(value))

				if (lines.length === 0) {
					return null
				}

				return lines.join('\n')
			}

			const formatNetwork = (
				entry: Record<string, unknown>
			): string | null => {
				const name = (entry.name || entry.interface) as
					| string
					| undefined
				const status = entry.status as string | undefined
				const rx = (entry.performance as any)?.rx as
					| { value?: number; unit?: string }
					| undefined
				const tx = (entry.performance as any)?.tx as
					| { value?: number; unit?: string }
					| undefined

				const perfParts = [
					rx?.value ? `Rx ${rx.value} ${rx.unit ?? ''}`.trim() : null,
					tx?.value ? `Tx ${tx.value} ${tx.unit ?? ''}`.trim() : null
				].filter(Boolean)

				const meta = [
					status,
					perfParts.length ? perfParts.join(', ') : null
				].filter(Boolean)

				if (!name && meta.length === 0) {
					return null
				}

				return [name, meta.length ? `(${meta.join('; ')})` : null]
					.filter(Boolean)
					.join(' ')
			}

			const formatDiskUsageEntry = (
				entry: Record<string, unknown>
			): string | null => {
				const disk = (entry.disk || entry.name) as string | undefined
				const usage = entry.usage as
					| {
							total?: number
							used?: number
							free?: number
							percent?: number
					  }
					| undefined

				if (!disk && !usage) {
					return null
				}

				const parts: string[] = []

				if (usage?.total !== undefined && !Number.isNaN(usage.total)) {
					parts.push(`Всего ${usage.total.toFixed(2)} ГБ`)
				}
				if (usage?.used !== undefined && !Number.isNaN(usage.used)) {
					parts.push(`Исп. ${usage.used.toFixed(2)} ГБ`)
				}
				if (
					usage?.percent !== undefined &&
					!Number.isNaN(usage.percent)
				) {
					parts.push(`${usage.percent.toFixed(1)}%`)
				}

				const details = parts.join(', ')
				return [disk, details].filter(Boolean).join(' — ')
			}

			const formatGenericObject = (
				entry: Record<string, unknown>
			): string =>
				Object.entries(entry)
					.map(([key, value]) => {
						if (
							value === null ||
							value === undefined ||
							value === ''
						) {
							return null
						}

						const formattedValue = formatHardwareEntry(value)
						if (!formattedValue) {
							return null
						}

						return `${humanizeKey(key)}: ${formattedValue}`
					})
					.filter((value): value is string => Boolean(value))
					.join(', ')

			const formatHardwareEntry = (entry: unknown): string => {
				if (!entry) {
					return ''
				}

				if (typeof entry === 'string' || typeof entry === 'number') {
					return String(entry)
				}

				if (Array.isArray(entry)) {
					return entry
						.map(value => formatHardwareEntry(value))
						.filter(Boolean)
						.join('\n')
				}

				if (typeof entry === 'object') {
					const record = entry as Record<string, unknown>

					const motherboard = formatMotherboard(record)
					if (motherboard) {
						return motherboard
					}

					const memoryModule = formatMemoryModule(record)
					if (memoryModule) {
						return memoryModule
					}

					if (Array.isArray(record.modules)) {
						return record.modules
							.map(item => formatHardwareEntry(item))
							.filter(Boolean)
							.join('\n')
					}

					const gpu = formatGpu(record)
					if (gpu) {
						return gpu
					}

					const disk = formatDisk(record)
					if (disk) {
						return disk
					}

					const network = formatNetwork(record)
					if (network) {
						return network
					}

					const diskUsageEntry = formatDiskUsageEntry(record)
					if (diskUsageEntry) {
						return diskUsageEntry
					}

					return formatGenericObject(record)
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

			const formatResponsible = (employee?: {
				firstName?: string | null
				lastName?: string | null
			}): string => {
				if (!employee) {
					return ''
				}

				return [employee.lastName, employee.firstName]
					.filter(Boolean)
					.join(' ')
			}

			const formatContacts = (employee?: {
				email?: string | null
				phone?: string | null
			}): string => {
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

				const rawSerial: string =
					typeof (item as { serialNumber?: string }).serialNumber ===
					'string'
						? (item as { serialNumber?: string }).serialNumber!
						: ''

				const serialNumber: string =
					item.device?.serialNumber &&
					typeof item.device.serialNumber === 'string'
						? item.device.serialNumber
						: rawSerial

				return [
					item.id,
					item.device?.name ? item.device.name : 'Неизвестно',
					item.device?.ipAddress || '',
					serialNumber,
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
				inventory.departments
					?.map(department => department.name)
					.filter(Boolean) || []

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
				['Дата формирования отчёта', formatDate(new Date(), true)],
				[
					'Создатель инвентаризации',
					inventory.user?.name || inventory.userId || 'Неизвестно'
				],
				[
					'Отделы',
					(departmentNames.length
						? departmentNames
						: fallbackDepartments
					).join(', ') || 'Все отделы'
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
				'Накопители',
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
