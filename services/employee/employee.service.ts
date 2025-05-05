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

    async create(data: IEmployeeCreateInput): Promise<Employee> {
        if (data.email) {
            const existingEmployee = await this.findByEmail(data.email)
            if (existingEmployee) {
                throw new Error('Сотрудник с таким email уже существует')
            }
        }
        if (data.departmentId) {
            const department = await this.prisma.department.findFirst({
                where: { id: data.departmentId }
            })
            if (!department) {
                throw new Error('Указанный отдел не существует')
            }
        }

        return await this.model.create({
            data,
            include: {
                department: true,
                devices: true
            }
        });
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
            include: {
                department: true,
                devices: true
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

    async update(id: string, data: Partial<IEmployeeCreateInput>): Promise<Employee> {
        if (data.email) {
            const existingEmployee = await this.findByEmail(data.email);
            if (existingEmployee && existingEmployee.id !== id) {
                throw new Error('Сотрудник с таким email уже существует');
            }
        }

        if (data.departmentId) {
            const department = await this.prisma.department.findUnique({
                where: { id: data.departmentId }
            });
            if (!department) {
                throw new Error('Указанный отдел не существует');
            }
        }

        return await this.model.update({
            where: { id },
            data,
            include: {
                department: true,
                devices: true
            }
        });
    }

    async delete(id: string, unassignDevices: boolean = true): Promise<Employee> {
        const employee = await this.model.findUnique({
            where: { id },
            include: { devices: true }
        });

        if (!employee) {
            throw new Error('Сотрудник не найден');
        }

        if (employee.devices.length > 0) {
            if (!unassignDevices) {
                throw new Error('Невозможно удалить сотрудника, за которым закреплены устройства');
            }
            // Открепляем устройства перед удалением
            await this.unassignDevices(id);
        }

        return await this.model.delete({
            where: { id },
            include: {
                department: true
            }
        });
    }

    async unassignDevices(employeeId: string): Promise<void> {
        await this.prisma.device.updateMany({
            where: { employeeId },
            data: { employeeId: null }
        });
    }

    async getDevicesCount(employeeId: string): Promise<number> {
        return await this.prisma.device.count({
            where: { employeeId }
        });
    } 
}