import { TelegramSettings } from '@prisma/client'

export interface ITelegramSettingsCreateInput
	extends Omit<TelegramSettings, 'id' | 'createdAt' | 'updatedAt'> {
	userId: string
}

export interface ITelegramSettingsFindManyArgs {}

export interface ITelegramSettingsRepository {
	update(
		userId: string,
		data: Partial<ITelegramSettingsCreateInput>
	): Promise<TelegramSettings>
	findByUserId(userId: string): Promise<TelegramSettings | null>
}
