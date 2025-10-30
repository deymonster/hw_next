import { PrismaClient } from '@prisma/client'
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import { NotificationSettingsService } from '../../services/notification-settings/notification-settings.service'
import { createMockPrisma } from '../utils/mockPrisma'

describe('NotificationSettingsService', () => {
	const now = new Date()
	const notificationSetting = {
		id: 'notif-1',
		createdAt: now,
		updatedAt: now,
		siteNotification: true,
		telegramNotification: false,
		userId: 'user-1'
	}

	let context: ReturnType<typeof createMockPrisma>
	let service: NotificationSettingsService

	beforeEach(() => {
		context = createMockPrisma({
			notificationSettings: [notificationSetting]
		})
		service = new NotificationSettingsService(
			context.client as unknown as PrismaClient
		)
	})

	it('retrieves settings by user id', async () => {
		const settings = await service.findByUserId('user-1')
		assert.strictEqual(settings?.siteNotification, true)
		assert.strictEqual(settings?.telegramNotification, false)
	})

	it('updates notification preferences', async () => {
		const updated = await service.update('user-1', {
			siteNotification: false,
			telegramNotification: true
		})

		assert.strictEqual(updated.siteNotification, false)
		assert.strictEqual(updated.telegramNotification, true)
		assert.ok(updated.updatedAt.getTime() > now.getTime())
	})
})
