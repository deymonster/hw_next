'use server'

import { EmployeeService } from '@/services/employee/employee.service'
import { EmployeeFilterOptions, IEmployeeCreateInput } from '@/services/employee/employee.interfaces'
import { Employee } from '@prisma/client'
import { prisma } from '@/libs/prisma'

const employeeService = new EmployeeService(prisma)

export async function getEmployees(options?: EmployeeFilterOptions): Promise<Employee[]> {
    try {
        const employees = await employeeService.findAll(options)
        return employees
    } catch (error) {
        console.error('Error fetching employees:', error)
        throw new Error('Не удалось загрузить список сотрудников')
    }
}

export async function createEmployee(data: IEmployeeCreateInput): Promise<Employee> {
    try {
        const employee = await employeeService.create(data)
        return employee
    } catch (error) {
        console.error('Error creating employee:', error)
        throw new Error('Не удалось создать сотрудника')
    }
}

export async function updateEmployee(id: string, data: Partial<IEmployeeCreateInput>): Promise<Employee> {
    try {
        const employee = await employeeService.update(id, data)
        return employee
    } catch (error) {
        console.error('Error updating employee:', error)
        throw new Error('Не удалось обновить данные сотрудника')
    }
}

export async function deleteEmployee(id: string, unassignDevices: boolean = true): Promise<Employee> {
    try {
        const employee = await employeeService.delete(id, unassignDevices)
        return employee
    } catch (error) {
        console.error('Error deleting employee:', error)
        throw new Error('Не удалось удалить сотрудника')
    }
}