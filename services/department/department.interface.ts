import { Department } from '@prisma/client'

export interface DepartmentFilterOptions {
    name?: string
    orderBy?: {
        field: 'name' | 'createdAt'
        direction: 'asc' | 'desc'
    }
}

export interface IDepartmentCreateInput {
    name: string
    description?: string
}

export interface IDepartmentFindManyArgs {
    where?: {
        name?: string
    }
    orderBy?: {
        [key: string]: 'asc' | 'desc'
    }
    take?: number
    skip?: number
}


export interface IDepartmentRepository {
    // Базовые операции наследуются из IBaseRepository
    
    // Специфичные методы для отделов
    findByName(name: string): Promise<Department | null>
    getDevicesCount(departmentId: string): Promise<number>
}