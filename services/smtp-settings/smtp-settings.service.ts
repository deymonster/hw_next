import { SmtpSettings, PrismaClient } from "@prisma/client";
import { BaseRepository } from "@/services/base.service";
import { ISmtpSettingsCreateInput, ISmtpSettingsRepository, ISmtpSettingsFindManyArgs } from "./smtp-settiings.constants";

export class SmtpSettingsService
    extends BaseRepository<SmtpSettings, ISmtpSettingsCreateInput, ISmtpSettingsFindManyArgs, PrismaClient['smtpSettings'], string>
    implements ISmtpSettingsRepository
{
    constructor(prisma: PrismaClient) {
        super(prisma, (p) => p.smtpSettings);
    }

    async findByUserId(userId: string): Promise<SmtpSettings | null> {
        return this.model.findUnique({
            where: { userId }
        });
    }

    async update(userId: string, data: Partial<ISmtpSettingsCreateInput>): Promise<SmtpSettings> {
        return this.model.update({
            where: { userId },
            data
        });
    }
}