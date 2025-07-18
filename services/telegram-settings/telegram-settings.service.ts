import { PrismaClient, TelegramSettings } from '@prisma/client'

import {
	ITelegramSettingsCreateInput,
	ITelegramSettingsFindManyArgs,
	ITelegramSettingsRepository
} from './telegram-settings.interfaces'

import { BaseRepository } from '@/services/base.service'

export class TelegramSettingsService
	extends BaseRepository<
		TelegramSettings,
		ITelegramSettingsCreateInput,
		ITelegramSettingsFindManyArgs,
		PrismaClient['telegramSettings'],
		string
	>
	implements ITelegramSettingsRepository
{
	constructor(prisma: PrismaClient) {
		super(prisma, p => p.telegramSettings)
	}

	async findByUserId(userId: string): Promise<TelegramSettings | null> {
		return this.model.findUnique({
			where: { userId }
		})
	}

	async update(
		userId: string,
		data: Partial<ITelegramSettingsCreateInput>
	): Promise<TelegramSettings> {
		return this.model.upsert({
			where: { userId },
			create: {
				userId,
				botToken: data.botToken ?? '',
				botUsername: data.botUsername || '',
				isActive: data.isActive ?? false,
				telegramChatId: data.telegramChatId ?? null,
				username: data.username ?? '',
				firstName: data.firstName ?? '',
				lastInteractionAt: data.lastInteractionAt ?? null
			},
			update: data
		})
	}
}
