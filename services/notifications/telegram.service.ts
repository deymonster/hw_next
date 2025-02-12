import { BaseNotificationService } from './base.notification.service';
import { TelegramPayload } from './types';
import { Telegraf } from 'telegraf';
import { services } from "@/services"

export class TelegramService extends BaseNotificationService {
    private bot: Telegraf | null = null;

    constructor() {
        super();
    }

    private async initBot(userId: string) {
        try {
            const settings = await services.data.telegram_settings.findByUserId(userId)

            if (!settings?.botToken) {
                throw new Error('Bot token not found');
            }

            this.bot = new Telegraf(settings.botToken);
            return true;
        } catch (error) {
            console.error('[TELEGRAM_SERVICE_ERROR]', error);
            return false;
        }
    }

    async verifyBot(token: string): Promise<{
        isValid: boolean;
        username?: string;
        error?: string
    }> {
        try{
            const tempBot = new Telegraf(token);
            const botInfo = await tempBot.telegram.getMe();
            tempBot.stop();

            return {
                isValid: true,
                username: botInfo.username
            }
        } catch (error) {
            console.error('[TELEGRAM_VERIFY_ERROR]', error);
            return {
                isValid: false,
                error: error instanceof Error ? error.message: 'Failed to verify bot'
            }
        }
    }

    async send(payload: TelegramPayload): Promise<boolean> {
        try {
            if (!this.bot) {
                await this.initBot(payload.userId);
            }
            if (!this.bot) {
                throw new Error('Bot not initialized');
            }

            await this.bot.telegram.sendMessage(payload.chatId, payload.text, {parse_mode: 'HTML'})
            return true;
        } catch (error) {
            console.error('[TELEGRAM_SEND_ERROR]', error);
            return false;
        }
    }

    async sendNotification(userId: string, chatId: string, message: string): Promise<boolean> {
        return this.send({
            userId,
            chatId,
            text: message
        })
    }

    generateBotLink(username: string): string {
        return `https://t.me/${username}`;
    }

    async startBot(userId: string, onStart?: (chatId: string, username?: string, firstName?: string) => Promise<void>): Promise<void> {
        if (!this.bot) {
            await this.initBot(userId);
        }

        if (!this.bot) {
            throw new Error('Bot not initialized');
        }

        this.bot.command('start', async (ctx) => {
            const chatId = ctx.chat.id.toString();
            const username = ctx.from.username;
            const firstName = ctx.from.first_name;

            if (onStart) {
                await onStart(chatId, username, firstName);
            }

            await ctx.reply('Welcome to NITRINOnet Monitoring Bot! Your chat has been successfully connected.')
        })

        await this.bot.launch();

        process.once('SIGINT', () => this.bot?.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
    }

    async stopBot(): Promise<void> {
        if (this.bot) {
            this.bot.stop();
            this.bot = null;
        }
    }
}
