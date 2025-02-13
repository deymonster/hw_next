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
            
            const result = {
                isValid: true,
                username: botInfo.username,
                firstName: botInfo.first_name
            };


            return result
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
        
        try {
            if (!this.bot) {
                await this.initBot(userId);
            }

            if (!this.bot) {
                throw new Error('Bot not initialized');
            }
            console.log('[TELEGRAM_BOT] Starting bot...');

            this.bot.command('start', async (ctx) => {
                const chatId = ctx.chat.id.toString();
                const username = ctx.from.username;
                const firstName = ctx.from.first_name;
    
                console.log('[TELEGRAM_BOT] Received /start command:', { chatId, username, firstName });
    
                if (onStart) {
                    await onStart(chatId, username, firstName);
                }
                ctx.reply(`✅ NITRINOnet Monitoring

🤖 Бот успешно активирован и настроен для получения уведомлений!

👤 Информация о подключении:
• Username: ${username || 'не указан'}
• Имя: ${firstName || 'не указано'}

Вы будете получать уведомления о важных событиях системы мониторинга.`)
    
                console.log('[TELEGRAM_BOT] Stopping bot after successful connection');
                await this.stopBot();
            })
            await this.bot.launch();
            console.log('[TELEGRAM_BOT] Bot launched successfully');
        } catch (error) {
            console.error('[TELEGRAM_BOT_ERROR]', error);
            throw error;
        }
                
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
