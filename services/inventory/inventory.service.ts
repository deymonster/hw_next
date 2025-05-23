import { Inventory, PrismaClient, InventoryItem } from "@prisma/client"
import { BaseRepository } from "../base.service"
import { IInventoryCreateInput, IInventoryFindManyArgs, IInventoryItemCreateInput, IInventoryRepository } from "./inventory.interface"

export class InventoryService
    extends BaseRepository<Inventory, IInventoryCreateInput, IInventoryFindManyArgs, PrismaClient['inventory'], string>
    implements IInventoryRepository 
{
    constructor(prisma: PrismaClient) {
        super(prisma, (p) => p.inventory)
    }

    async findWithItems(id: string): Promise<Inventory & { items: InventoryItem[] }> {
        const inventory = await this.model.findUnique({
            where: { id },
            include: {
                items: true
            }
        })

        if (!inventory) {
            throw new Error('Инвентаризация не найдена')
        }

        return inventory
    }

    async addItem(inventoryId: string, item: IInventoryItemCreateInput): Promise<InventoryItem> {
        return await this.prisma.inventoryItem.create({
            data: {
                ...item,
                inventoryId
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
                items: true
            }
        })
    }
}