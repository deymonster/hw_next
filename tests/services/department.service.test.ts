import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DeviceStatus, DeviceType, PrismaClient } from '@prisma/client'

import { DepartmentService } from '../../services/department/department.service'
import { createMockPrisma } from '../utils/mockPrisma'

const createDepartment = (id: string, name: string) => {
        const now = new Date()
        return {
                id,
                name,
                description: null,
                createdAt: now,
                updatedAt: now
        }
}

describe('DepartmentService', () => {
        it('creates, updates and deletes departments', async () => {
                const context = createMockPrisma()
                const service = new DepartmentService(context.client as unknown as PrismaClient)

                const created = await service.create({ name: 'HR' })
                assert.strictEqual(created.name, 'HR')
                assert.strictEqual(context.state.departments.length, 1)

                const updated = await service.update(created.id, { description: 'People operations' })
                assert.strictEqual(updated.description, 'People operations')

                await service.delete(created.id)
                assert.strictEqual(context.state.departments.length, 0)
        })

        it('returns departments with employee and device counts', async () => {
                const department = createDepartment('dept-1', 'Engineering')
                const employee = {
                        id: 'emp-1',
                        firstName: 'Ivan',
                        lastName: 'Ivanov',
                        email: null,
                        phone: null,
                        position: 'Developer',
                        departmentId: 'dept-1'
                }
                const now = new Date()
                const device = {
                        id: 'dev-1',
                        name: 'Workstation',
                        ipAddress: '10.0.0.10',
                        agentKey: 'agent-10',
                        serialNumber: null,
                        purchaseDate: null,
                        warrantyPeriod: null,
                        lastUpdate: now,
                        status: DeviceStatus.ACTIVE,
                        type: DeviceType.WINDOWS,
                        departmentId: 'dept-1',
                        employeeId: null,
                        deviceTag: null,
                        createdAt: now,
                        updatedAt: now,
                        lastSeen: now,
                        activationSig: null,
                        activationKeyVer: null,
                        activatedAt: null
                }

                const context = createMockPrisma({
                        departments: [department],
                        employees: [employee],
                        devices: [device]
                })
                const service = new DepartmentService(context.client as unknown as PrismaClient)

                const departments = await service.findAllWithCounts()

                assert.strictEqual(departments.length, 1)
                assert.strictEqual(departments[0].deviceCount, 1)
                assert.strictEqual(departments[0].employeesCount, 1)
                assert.strictEqual(departments[0].employees[0].firstName, 'Ivan')
                assert.strictEqual(departments[0].devices[0].name, 'Workstation')
        })
})
