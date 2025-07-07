import { PrismaClient, SmtpSettings } from '@prisma/client'

import {
	ISmtpSettingsCreateInput,
	ISmtpSettingsFindManyArgs,
	ISmtpSettingsRepository
} from './smtp-settiings.constants'

import { BaseRepository } from '@/services/base.service'
import { decrypt, encrypt } from '@/utils/crypto/crypto'

export class SmtpSettingsService
	extends BaseRepository<
		SmtpSettings,
		ISmtpSettingsCreateInput,
		ISmtpSettingsFindManyArgs,
		PrismaClient['smtpSettings'],
		string
	>
	implements ISmtpSettingsRepository
{
	constructor(prisma: PrismaClient) {
		super(prisma, p => p.smtpSettings)
	}

	async findByUserId(userId: string): Promise<SmtpSettings | null> {
		return this.model.findUnique({
			where: { userId }
		})
	}

	async update(
		userId: string,
		data: Partial<ISmtpSettingsCreateInput>
	): Promise<SmtpSettings> {
		if (data.password) {
			console.log(
				'[SMTP_SERVICE] Before encryption password:',
				data.password
			)
			data.password = encrypt(data.password)
			console.log(
				'[SMTP_SERVICE] After encryption password:',
				data.password
			)
		}
		return this.model.update({
			where: { userId },
			data
		})
	}

	async getDecryptedPassword(userId: string): Promise<string | null> {
		const settings = await this.findByUserId(userId)
		if (!settings) return null

		return decrypt(settings.password)
	}
}
