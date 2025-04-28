import { Employee, PrismaClient } from "@prisma/client"
import { BaseRepository } from "../base.service"
import { IEmployeeCreateInput, IEmployeeFindManyArgs, IEmployeeRepository, EmployeeFilterOptions } from './employee.interfaces'

export class EmployeeService 
    extends BaseRepository<Employee, IEmployeeCreateInput, IEmployeeFindManyArgs, PrismaClient['employee'], string>
    implements IEmployeeRepository 
{
    constructor(prisma: PrismaClient) {
        super(prisma, (p) => p.employee)
    }

    async findByEmail(email: string): Promise<Employee | null> {
        return await this.model.findFirst({
            where: { email }
        })
    }

    async findAll(options?: EmployeeFilterOptions): Promise<Employee[]> {
        return await this.model.findMany({
            where: {
                ...(options?.name && { 
                    OR: [
                        { firstName: { contains: options.name } },
                        { lastName: { contains: options.name } }
                    ]
                }),
                ...(options?.departmentId && { departmentId: options.departmentId }),
                ...(options?.role && { position: options.role })
            },
            orderBy: options?.orderBy 
                ? { [options.orderBy.field]: options.orderBy.direction }
                : { firstName: 'asc' } 
        })
    }

    async findByDepartment(departmentId: string): Promise<Employee[]> {
        return await this.model.findMany({
            where: { departmentId },
            orderBy: { firstName: 'asc' }
        })
    }

    async findByRole(role: string): Promise<Employee[]> {
        return await this.model.findMany({
            where: { position: role },
            orderBy: { firstName: 'asc' }
        })
    }
}