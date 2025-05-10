import { Employee, Prisma } from '@prisma/client'

export interface EmployeeFilterOptions {
    name?: string
    departmentId?: string
    role?: string
    orderBy?: {
        field: 'firstName' | 'lastName' | 'position' | 'createdAt'
        direction: 'asc' | 'desc'
    }
}

export interface IEmployeeCreateInput {
    firstName: string
    lastName: string
    email?: string
    phone?: string
    position?: string
    departmentId?: string
    devices?: {
        set?: { id: string }[]
        connect?: { id: string }[]
        disconnect?: { id: string }[]
    }
}

export interface IEmployeeFindManyArgs {
    where?: {
        firstName?: string
        lastName?: string
        email?: string
        position?: string
        departmentId?: string
    }
    orderBy?: {
        [key: string]: Prisma.SortOrder
    }
    take?: number
    skip?: number
}

export interface IEmployeeRepository {
    findByEmail(email: string): Promise<Employee | null>
    findByDepartment(departmentId: string): Promise<Employee[]>
    findByRole(position: string): Promise<Employee[]>
    getDevicesCount(employeeId: string): Promise<number>
    unassignDevices(employeeId: string): Promise<void>
    delete(id: string, unassignDevices?: boolean): Promise<Employee>
}
