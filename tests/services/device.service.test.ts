import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DeviceStatus, DeviceType, PrismaClient } from '@prisma/client'

import { DeviceService } from '../../services/device/device.service'
import { createMockPrisma } from '../utils/mockPrisma'

describe('DeviceService', () => {
        const now = new Date()
        let context: ReturnType<typeof createMockPrisma>
        let service: DeviceService

        beforeEach(() => {
                context = createMockPrisma({
                        devices: [
                                {
                                        id: 'device-1',
                                        name: 'Scanner',
                                        ipAddress: '10.1.0.1',
                                        agentKey: 'agent-1',
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
                        ]
                })
                service = new DeviceService(context.client as unknown as PrismaClient)
        })

        it('creates and deletes devices', async () => {
                const created = await service.create({
                        name: 'Laptop',
                        ipAddress: '10.1.0.2',
                        agentKey: 'agent-2',
                        type: DeviceType.WINDOWS,
                        departmentId: 'dept-1'
                })

                assert.ok(created.id)
                assert.strictEqual(context.state.devices.length, 2)

                const deleted = await service.deleteDevice(created.id)
                assert.strictEqual(deleted.id, created.id)
                assert.strictEqual(context.state.devices.length, 1)
        })

        it('reassigns department devices when updating department mapping', async () => {
                context.state.devices.push({
                        id: 'device-2',
                        name: 'Workstation',
                        ipAddress: '10.1.0.3',
                        agentKey: 'agent-3',
                        serialNumber: null,
                        purchaseDate: null,
                        warrantyPeriod: null,
                        lastUpdate: now,
                        status: DeviceStatus.ACTIVE,
                        type: DeviceType.WINDOWS,
                        departmentId: null,
                        employeeId: null,
                        deviceTag: null,
                        createdAt: now,
                        updatedAt: now,
                        lastSeen: now,
                        activationSig: null,
                        activationKeyVer: null,
                        activatedAt: null
                })

                await service.updateDepartmentDevices('dept-1', ['device-2'])

                const deviceOne = context.state.devices.find(device => device.id === 'device-1')
                const deviceTwo = context.state.devices.find(device => device.id === 'device-2')
                assert.strictEqual(deviceOne?.departmentId, null)
                assert.strictEqual(deviceTwo?.departmentId, 'dept-1')
        })

        it('calculates device statistics grouped by status and type', async () => {
                context.state.devices.push({
                        id: 'device-3',
                        name: 'Server',
                        ipAddress: '10.1.0.4',
                        agentKey: 'agent-4',
                        serialNumber: null,
                        purchaseDate: null,
                        warrantyPeriod: null,
                        lastUpdate: now,
                        status: DeviceStatus.INACTIVE,
                        type: DeviceType.LINUX,
                        departmentId: null,
                        employeeId: null,
                        deviceTag: null,
                        createdAt: now,
                        updatedAt: now,
                        lastSeen: now,
                        activationSig: null,
                        activationKeyVer: null,
                        activatedAt: null
                })

                const stats = await service.getDeviceStats()

                assert.strictEqual(stats.total, 2)
                assert.strictEqual(stats.byStatus.ACTIVE, 1)
                assert.strictEqual(stats.byStatus.INACTIVE, 1)
                assert.strictEqual(stats.byType.WINDOWS, 1)
                assert.strictEqual(stats.byType.LINUX, 1)
        })
})
