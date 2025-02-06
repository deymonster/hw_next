import { TelegramSettings, PrismaClient } from "@prisma/client";
import { BaseRepository } from "@/services/base.service";
import { ITelegramSettingsCreateInput, ITelegramSettingsRepository, ITelegramSettingsFindManyArgs } from "./telegram-settings.interfaces";

export class TelegramSettingsService
    extends BaseRepository<TelegramSettings, ITelegramSettingsCreateInput, ITelegramSettingsFindManyArgs, PrismaClient['telegramSettings'], string>
    implements ITelegramSettingsRepository
{
    constructor(prisma: PrismaClient) {
        super(prisma, (p) => p.telegramSettings);
    }

    async findByUserId(userId: string): Promise<TelegramSettings | null> {
        return this.model.findUnique({
            where: { userId }
        });
    }

    async update(userId: string, data: Partial<ITelegramSettingsCreateInput>): Promise<TelegramSettings> {
        return this.model.update({
            where: { userId },
            data
        });
    }
}