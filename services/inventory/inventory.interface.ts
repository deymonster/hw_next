import { Inventory, InventoryItem } from '@prisma/client'

import { IBaseRepository } from '../base.interfaces'

export interface IInventoryCreateInput {
	userId: string
	startDate?: Date
	departments?: {
		connect: { id: string }[]
	}
}

export interface IInventoryItemCreateInput {
	deviceId: string
	inventoryId: string
	serialNumber?: string
	processor?: string
	motherboard?: any
	memory?: any
	storage?: any
	networkCards?: any
	videoCards?: any
	diskUsage?: any
	employeeId?: string
	departmentId?: string
}

export interface IInventoryFindManyArgs {
	where?: {
		userId?: string
		startDate?: {
			gte?: Date
			lte?: Date
		}
	}
	orderBy?: {
		startDate?: 'asc' | 'desc'
	}
	include?: {
		items?:
			| boolean
			| {
					include?: {
						device?: boolean
						employee?: boolean
						department?: boolean
					}
			  }
		user?: boolean
		departments?: boolean
	}
}

export interface IInventoryRepository
	extends IBaseRepository<
		Inventory,
		IInventoryCreateInput,
		IInventoryFindManyArgs,
		string
	> {
	// Специфичные методы для инвентаризации
	findWithItems(id: string): Promise<Inventory & { items: InventoryItem[] }>
	addItem(
		inventoryId: string,
		item: IInventoryItemCreateInput
	): Promise<InventoryItem>
	removeItem(inventoryId: string, itemId: string): Promise<void>
	getLatestInventory(userId: string): Promise<Inventory | null>
	findAllWithItems(
		args?: IInventoryFindManyArgs
	): Promise<(Inventory & { items: InventoryItem[] })[]>
	delete(id: string): Promise<Inventory>
}
