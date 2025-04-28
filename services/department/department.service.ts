import { Department, PrismaClient } from "@prisma/client"
import { BaseRepository } from "../base.service"
import { IDepartmentCreateInput, IDepartmentFindManyArgs, IDepartmentRepository, DepartmentFilterOptions } from './department.interface'


export class DepartmentService 
    extends BaseRepository<Department, IDepartmentCreateInput, IDepartmentFindManyArgs, PrismaClient['department'], string>
    implements IDepartmentRepository 
{
    constructor(prisma: PrismaClient) {
        super(prisma, (p) => p.department)
    }

    async findByName(name: string): Promise<Department | null> {
        return await this.model.findFirst({
            where: { name }
        })
    }

    async findAll(options?: DepartmentFilterOptions): Promise<Department[]> {
        return await this.model.findMany({
            where: {
                ...(options?.name && { name: { contains: options.name } })
            },
            orderBy: options?.orderBy 
                ? { [options.orderBy.field]: options.orderBy.direction }
                : { name: 'asc' } 
        })
    }

    async getDevicesCount(departmentId: string): Promise<number> {
        return await this.prisma.device.count({
            where: { departmentId }
        })
    }
}



