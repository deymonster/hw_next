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

export interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        encryptedPassword: string;
    };
    fromEmail: string;
    fromName?: string | null;
}

