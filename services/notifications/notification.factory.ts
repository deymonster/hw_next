import { EmailService } from './email.service';
import { TelegramService } from './telegram.service';

export class NotificationFactory {
    private readonly emailService: EmailService;
    private readonly telegramService: TelegramService;

    constructor() {
        this.emailService = new EmailService();
        this.telegramService = new TelegramService();
    }

    get email() {
        return this.emailService;
    }

    get telegram() {
        return this.telegramService;
    }
}
