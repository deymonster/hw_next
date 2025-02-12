'use server'

import { services } from "@/services"

export async function verifyTelegramBotAction(token:  string) {
    return services.infrastructure.notifications.telegram.verifyBot(token)
}


