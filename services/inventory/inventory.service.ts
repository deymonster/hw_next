import { Department, Inventory, InventoryItem, PrismaClient, User } from '@prisma/client'

import { BaseRepository } from '../base.service'
import {
	IInventoryCreateInput,
	IInventoryFindManyArgs,
	IInventoryItemCreateInput,
	IInventoryRepository
} from './inventory.interface'

export class InventoryService
	extends BaseRepository<
		Inventory,
		IInventoryCreateInput,
		IInventoryFindManyArgs,
		PrismaClient['inventory'],
		string
	>
	implements IInventoryRepository
{
	constructor(prisma: PrismaClient) {
		super(prisma, p => p.inventory)
	}

        async findWithItems(
                id: string
        ): Promise<Inventory & { items: InventoryItem[]; departments: Department[]; user: User }> {
                const inventory = await this.model.findUnique({
                        where: { id },
                        include: {
                                items: {
                                        include: {
                                                device: true,
                                                employee: true,
                                                department: true
                                        }
                                },
                                departments: true,
                                user: true
                        }
                })

		if (!inventory) {
			throw new Error('Инвентаризация не найдена')
		}

                return inventory
        }

	async findAllWithItems(
		args: IInventoryFindManyArgs
	): Promise<Array<Inventory & { items: InventoryItem[] }>> {
		const inventories = await this.model.findMany({
			where: args?.where,
			orderBy: args?.orderBy,
			include: {
				items: {
					include: {
						device: true,
						employee: true,
						department: true
					}
				},
				user: args?.include?.user || false,
				departments: true
			}
		})

		return inventories
	}

	async addItem(
		inventoryId: string,
		item: IInventoryItemCreateInput
	): Promise<InventoryItem> {
		// Получаем информацию об устройстве, чтобы взять данные о сотруднике и отделе
		const device = await this.prisma.device.findUnique({
			where: { id: item.deviceId },
			select: { employeeId: true, departmentId: true }
		})

		return await this.prisma.inventoryItem.create({
			data: {
				...item,
				inventoryId,
				employeeId: item.employeeId || device?.employeeId,
				departmentId: item.departmentId || device?.departmentId
			}
		})
	}

	async removeItem(inventoryId: string, itemId: string): Promise<void> {
		const item = await this.prisma.inventoryItem.findFirst({
			where: {
				id: itemId,
				inventoryId
			}
		})

		if (!item) {
			throw new Error('Элемент инвентаризации не найден')
		}

		await this.prisma.inventoryItem.delete({
			where: { id: itemId }
		})
	}

	async getLatestInventory(userId: string): Promise<Inventory | null> {
		return await this.model.findFirst({
			where: { userId },
			orderBy: { startDate: 'desc' },
			include: {
				items: true,
				departments: true
			}
		})
	}

	async delete(id: string): Promise<Inventory> {
		const inventory = await this.model.findUnique({
			where: { id },
			include: { items: true }
		})

		if (!inventory) {
			throw new Error('Инвентаризация не найдена')
		}

		await this.prisma.inventoryItem.deleteMany({
			where: { inventoryId: id }
		})

		return await this.model.delete({
			where: { id }
		})
	}
}
