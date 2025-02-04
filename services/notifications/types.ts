export interface NotificationPayload {
    subject?: string;
    text: string;
    html?: string;
}

export interface EmailPayload extends NotificationPayload {
    to: string;
    from?: string;
}

export interface TelegramPayload extends NotificationPayload {
    chatId: string | number;
}
