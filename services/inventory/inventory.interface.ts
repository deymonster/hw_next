import { Inventory, InventoryItem } from "@prisma/client"
import { IBaseRepository } from "../base.interfaces"


export interface IInventoryCreateInput {
    userId: string
    startDate?: Date
}

export interface IInventoryItemCreateInput {
    deviceId: string
    inventoryId: string
    deviceName: string
    ipAddress: string
    serialNumber?: string
    processor?: string
    motherboard?: any
    memory?: any
    storage?: any
    networkCards?: any
    videoCards?: any
    diskUsage?: any
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
        items?: boolean
        user?: boolean
    }
}

export interface IInventoryRepository extends IBaseRepository<Inventory, IInventoryCreateInput, IInventoryFindManyArgs, string> {
    // Специфичные методы для инвентаризации
    findWithItems(id: string): Promise<Inventory & { items: InventoryItem[] }>
    addItem(inventoryId: string, item: IInventoryItemCreateInput): Promise<InventoryItem>
    removeItem(inventoryId: string, itemId: string): Promise<void>
    getLatestInventory(userId: string): Promise<Inventory | null>
}
