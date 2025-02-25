import { Device, PrismaClient, DeviceStatus } from "@prisma/client"
import { BaseRepository } from "../base.service"
import { IDeviceCreateInput, IDeviceFindManyArgs, IDeviceRepository } from './device.interfaces'

export class DeviceService 
    extends BaseRepository<Device, IDeviceCreateInput, IDeviceFindManyArgs, PrismaClient['device'], string>
    implements IDeviceRepository 
{
    constructor(prisma: PrismaClient) {
        super(prisma, (p) => p.device)
    }

    async findByAgentKey(agentKey: string): Promise<Device | null> {
        return await this.model.findUnique({
            where: { agentKey }
        })
    }

    async findManyByAgentKeys(agentKeys: string[]): Promise<Device[]> {
        return await this.model.findMany({
            where: {
                agentKey: {
                    in: agentKeys
                }
            }
        })
    }

    async findByIpAddress(ipAddress: string): Promise<Device | null> {
        return await this.model.findFirst({
            where: { ipAddress }
        })
    }

    async findByLocation(locationId: string): Promise<Device[]> {
        return await this.model.findMany({
            where: { locationId },
            orderBy: { name: 'asc' }
        })
    }

    async findActiveDevices(): Promise<Device[]> {
        return await this.model.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { lastUpdate: 'desc' }
        })
    }

    async updateStatus(id: string, status: DeviceStatus): Promise<Device> {
        return await this.model.update({
            where: { id },
            data: { 
                status,
                lastUpdate: new Date()
            }
        })
    }

    async updateLastSeen(id: string): Promise<Device> {
        return await this.model.update({
            where: { id },
            data: { 
                lastSeen: new Date(),
                lastUpdate: new Date()
            }
        })
    }

    // Переопределяем create для автоматического добавления дат
    async create(data: IDeviceCreateInput): Promise<Device> {
        return await this.model.create({
            data: {
                ...data,
                lastUpdate: new Date(),
                lastSeen: new Date()
            }
        })
    }
}