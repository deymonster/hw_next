'use server'

import { EventSeverity, EventType, Prisma } from '@prisma/client'

import { auth } from '@/auth'
import { services } from '@/services/index'

export interface AuditEventInput {
	type: EventType
	severity: EventSeverity
	title: string
	message: string
	userId?: string
	deviceId?: string
	metadata?: Prisma.InputJsonValue
}

async function resolveUserId(explicitUserId?: string): Promise<string | null> {
	if (explicitUserId) {
		return explicitUserId
	}

	const session = await auth()
	const sessionUserId = session?.user?.id

	if (!sessionUserId || typeof sessionUserId !== 'string') {
		return null
	}

	return sessionUserId
}

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
	try {
		const userId = await resolveUserId(input.userId)

		if (!userId) {
			console.warn('[AUDIT_EVENT] Unable to resolve userId for event', {
				title: input.title,
				type: input.type
			})
			return
		}

		await services.data.event.create({
			type: input.type,
			severity: input.severity,
			title: input.title,
			message: input.message,
			userId,
			deviceId: input.deviceId ?? null,
			metadata: input.metadata,
			isRead: false,
			hardwareChangeConfirmed: false
		})
	} catch (error) {
		console.error('[AUDIT_EVENT_ERROR]', error)
	}
}
