'use server'

import { services } from '@/services/index';
import { Department } from '@prisma/client';
import { IDepartmentCreateInput } from '@/services/department/department.interface';


export async function getDepartments(): Promise<Department[]> {
    return await services.data.department.findAll();
}

export async function createDepartment(data: IDepartmentCreateInput): Promise<Department> {
    return await services.data.department.create(data);
}

export async function updateDepartment(id: string, data: Partial<IDepartmentCreateInput>): Promise<Department> {
    return await services.data.department.update(id, data);
}

export async function deleteDepartment(id: string): Promise<Department> {
    return await services.data.department.delete(id);
}

