import { BaseNotificationService } from './base.notification.service';
import { TelegramPayload } from './types';

export class TelegramService extends BaseNotificationService {
    private botToken: string;

    constructor() {
        super();
        this.botToken = process.env.TELEGRAM_BOT_TOKEN!;
    }

    async send(payload: TelegramPayload): Promise<boolean> {
        try {
            const response = await fetch(
                `https://api.telegram.org/bot${this.botToken}/sendMessage`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: payload.chatId,
                        text: payload.text,
                        parse_mode: 'HTML',
                    }),
                }
            );
            

            if (!response.ok) {
                throw new Error('Failed to send Telegram message');
            }

            return true;
        } catch (error) {
            console.error('[TELEGRAM_SERVICE_ERROR]', error);
            return false;
        }
    }

    async sendNotification(
        chatId: string | number,
        message: string
    ): Promise<boolean> {
        return this.send({
            chatId,
            text: message,
        });
    }
}
