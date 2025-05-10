import { Device, PrismaClient, DeviceStatus, DeviceType } from "@prisma/client"
import { BaseRepository } from "../base.service"
import { IDeviceCreateInput, IDeviceFindManyArgs, IDeviceRepository, DeviceFilterOptions } from './device.interfaces'

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

    async findAll(options?: DeviceFilterOptions): Promise<Device[]> {
        return await this.model.findMany({
            where: {
                ...(options?.status && { status: { in: options.status } }),
                ...(options?.type && { type: options.type }),
                ...(options?.departmentId && { departmentId: options.departmentId })
            },
            orderBy: options?.orderBy 
                ? { [options.orderBy.field]: options.orderBy.direction }
                : { lastUpdate: 'desc' } 
        })
    }

    async getDeviceStats(): Promise<{
        total: number
        byStatus: Record<DeviceStatus, number>
        byType: Record<DeviceType, number>
    }> {
        const devices = await this.model.findMany()
        return {
            total: devices.length,
            byStatus: devices.reduce((acc, device) => ({
                ...acc,
                [device.status]: (acc[device.status] || 0) + 1
            }), {} as Record<DeviceStatus, number>),
            byType: devices.reduce((acc, device) => ({
                ...acc,
                [device.type]: (acc[device.type] || 0) + 1
            }), {} as Record<DeviceType, number>)
        }
    }

    async updateIpAddress(id: string, ipAddress: string): Promise<Device> {
        return await this.model.update({
            where: {id },
            data: {
                ipAddress,
                lastUpdate: new Date()
            }
        })
    }

    async findByIpAddress(ipAddress: string): Promise<Device | null> {
        return await this.model.findFirst({
            where: { ipAddress }
        })
    }

    async findByLocation(departmentId: string): Promise<Device[]> {
        return await this.model.findMany({
            where: { departmentId },
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

    async deleteDevice(id: string): Promise<Device> {
        const device = await this.model.findUnique({
            where: { id }
        })

        if (!device) {
            throw new Error('Device not found')
        }

        return await this.model.delete({
            where: { id }
        })
    }

    async getDeviceStatus(id: string): Promise<{
        isOnline: boolean,
        lastSeen: Date | null,
        status: DeviceStatus
    }> {
        const device = await this.model.findUnique({
            where: { id },
            select: {
                lastSeen: true,
                status: true
            }
        })

        if (!device) {
            throw new Error('Device not found')
        }

        const isOnline = device.lastSeen
            ? new Date().getTime() - device.lastSeen.getTime() < 5 * 60 * 1000
            : false
        return {
            isOnline,
            lastSeen: device.lastSeen,
            status: device.status
        }
    }


}