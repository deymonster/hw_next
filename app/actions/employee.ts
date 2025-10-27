'use server'

import { Employee, EventSeverity, EventType } from '@prisma/client'

import { logAuditEvent } from './utils/audit-events'

import { prisma } from '@/libs/prisma'
import {
	EmployeeFilterOptions,
	IEmployeeCreateInput
} from '@/services/employee/employee.interfaces'
import { EmployeeService } from '@/services/employee/employee.service'

const employeeService = new EmployeeService(prisma)

const formatEmployeeName = (
	employee: Pick<Employee, 'firstName' | 'lastName'>
) => [employee.firstName, employee.lastName].filter(Boolean).join(' ')

async function logDeviceLinkEvents({
	employeeId,
	employeeName,
	deviceIds,
	action
}: {
	employeeId: string
	employeeName: string
	deviceIds: string[]
	action: 'connect' | 'disconnect'
}) {
	if (!deviceIds.length) {
		return
	}

	const devices = await prisma.device.findMany({
		where: { id: { in: deviceIds } },
		select: { id: true, name: true, ipAddress: true }
	})

	const title =
		action === 'connect'
			? 'Устройство назначено сотруднику'
			: 'Устройство отвязано от сотрудника'
	const severity =
		action === 'connect' ? EventSeverity.MEDIUM : EventSeverity.LOW

	await Promise.all(
		devices.map(device =>
			logAuditEvent({
				type: EventType.DEVICE,
				severity,
				title,
				message:
					action === 'connect'
						? `Устройство "${device.name}" назначено сотруднику ${employeeName}.`
						: `Устройство "${device.name}" отвязано от сотрудника ${employeeName}.`,
				deviceId: device.id,
				metadata: {
					employeeId,
					employeeName,
					action,
					device: {
						id: device.id,
						name: device.name,
						ipAddress: device.ipAddress
					}
				}
			})
		)
	)
}

export async function getEmployees(
	options?: EmployeeFilterOptions
): Promise<Employee[]> {
	try {
		const employees = await employeeService.findAll(options)
		return employees
	} catch (error) {
		console.error('Error fetching employees:', error)
		throw new Error('Не удалось загрузить список сотрудников')
	}
}

export async function createEmployee(
	data: IEmployeeCreateInput
): Promise<Employee> {
	try {
		const employee = await employeeService.create(data)
		const employeeName = formatEmployeeName(employee)

		await logAuditEvent({
			type: EventType.USER,
			severity: EventSeverity.LOW,
			title: 'Создан сотрудник',
			message: `Создан сотрудник ${employeeName}.`,
			metadata: {
				employeeId: employee.id,
				firstName: employee.firstName,
				lastName: employee.lastName,
				email: employee.email,
				phone: employee.phone,
				position: employee.position,
				departmentId: employee.departmentId
			}
		})

		const connectIds = [
			...(data.devices?.connect?.map(device => device.id) ?? []),
			...(data.devices?.set?.map(device => device.id) ?? [])
		]

		await logDeviceLinkEvents({
			employeeId: employee.id,
			employeeName,
			deviceIds: Array.from(new Set(connectIds)),
			action: 'connect'
		})

		return employee
	} catch (error) {
		console.error('Error creating employee:', error)
		throw new Error('Не удалось создать сотрудника')
	}
}

export async function updateEmployee(
	id: string,
	data: Partial<IEmployeeCreateInput>
): Promise<Employee> {
	try {
		const existingEmployee = await prisma.employee.findUnique({
			where: { id },
			include: {
				devices: { select: { id: true, name: true, ipAddress: true } },
				department: { select: { id: true, name: true } }
			}
		})

		if (!existingEmployee) {
			throw new Error('Сотрудник не найден')
		}

		const employee = await employeeService.update(id, data)
		const employeeName = formatEmployeeName(employee)

		await logAuditEvent({
			type: EventType.USER,
			severity: EventSeverity.MEDIUM,
			title: 'Обновлен сотрудник',
			message: `Данные сотрудника ${employeeName} обновлены.`,
			metadata: {
				employeeId: employee.id,
				previous: {
					firstName: existingEmployee.firstName,
					lastName: existingEmployee.lastName,
					email: existingEmployee.email,
					phone: existingEmployee.phone,
					position: existingEmployee.position,
					departmentId: existingEmployee.departmentId
				},
				current: {
					firstName: employee.firstName,
					lastName: employee.lastName,
					email: employee.email,
					phone: employee.phone,
					position: employee.position,
					departmentId: employee.departmentId
				}
			}
		})

		const previousDeviceIds = existingEmployee.devices.map(
			device => device.id
		)
		const connectIds = data.devices?.connect?.map(device => device.id) ?? []
		const disconnectIds =
			data.devices?.disconnect?.map(device => device.id) ?? []
		const setIds = data.devices?.set?.map(device => device.id) ?? []

		const effectiveConnectIds = new Set([
			...connectIds,
			...setIds.filter(id => !previousDeviceIds.includes(id))
		])
		const effectiveDisconnectIds = new Set([
			...disconnectIds,
			...previousDeviceIds.filter(
				id => setIds.length > 0 && !setIds.includes(id)
			)
		])

		await logDeviceLinkEvents({
			employeeId: employee.id,
			employeeName,
			deviceIds: Array.from(effectiveConnectIds),
			action: 'connect'
		})

		await logDeviceLinkEvents({
			employeeId: employee.id,
			employeeName,
			deviceIds: Array.from(effectiveDisconnectIds),
			action: 'disconnect'
		})

		return employee
	} catch (error) {
		console.error('Error updating employee:', error)
		throw new Error('Не удалось обновить данные сотрудника')
	}
}

export async function deleteEmployee(
	id: string,
	unassignDevices: boolean = true
): Promise<Employee> {
	try {
		const existingEmployee = await prisma.employee.findUnique({
			where: { id },
			include: {
				devices: { select: { id: true, name: true, ipAddress: true } },
				department: { select: { id: true, name: true } }
			}
		})

		if (!existingEmployee) {
			throw new Error('Сотрудник не найден')
		}

		const employee = await employeeService.delete(id, unassignDevices)
		const employeeName = formatEmployeeName(existingEmployee)

		await logAuditEvent({
			type: EventType.USER,
			severity: EventSeverity.HIGH,
			title: 'Удален сотрудник',
			message: `Сотрудник ${employeeName} удален из системы.`,
			metadata: {
				employeeId: id,
				firstName: existingEmployee.firstName,
				lastName: existingEmployee.lastName,
				email: existingEmployee.email,
				phone: existingEmployee.phone,
				position: existingEmployee.position,
				departmentId: existingEmployee.departmentId,
				devicesDetached: existingEmployee.devices.map(device => ({
					id: device.id,
					name: device.name,
					ipAddress: device.ipAddress
				}))
			}
		})

		await logDeviceLinkEvents({
			employeeId: id,
			employeeName,
			deviceIds: existingEmployee.devices.map(device => device.id),
			action: 'disconnect'
		})

		return employee
	} catch (error) {
		console.error('Error deleting employee:', error)
		throw new Error('Не удалось удалить сотрудника')
	}
}
