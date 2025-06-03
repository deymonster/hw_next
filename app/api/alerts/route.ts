import { NextRequest, NextResponse } from 'next/server';
import { services } from '@/services';
import { Alert, AlertManagerPayload } from '@/services/notifications/alermanager.types';
import { generateAlertEmailHtml, generateAlertTelegramText } from '@/services/notifications/templates/alert.template';
import { EventType, EventSeverity } from '@prisma/client';

// Извлекаем сервисы
const { notification_settings, telegram_settings, user, event } = services.data;
const { alertRulesManager } = services;
const notificationFactory = services.infrastructure.notifications;

// Функция для определения типа события на основе алерта
function determineEventType(alert: Alert): EventType {
    const alertName = alert.labels.alertname?.toLowerCase() || '';
    
    // Логика группировки по типам
    if (alertName.includes('hardware') || alertName.includes('disk') || alertName.includes('memory')) {
        return EventType.DEVICE;
    }
    
    if (alertName.includes('system') || alertName.includes('service')) {
        return EventType.SYSTEM;
    }
    
    if (alert.labels.severity === 'info') {
        return EventType.INFO;
    }
    
    // По умолчанию - ALERT для критических уведомлений
    return EventType.ALERT;
}


// Функция для маппинга серьезности алерта в серьезность события
function mapAlertSeverityToEventSeverity(alertSeverity: string): EventSeverity {
    switch (alertSeverity?.toLowerCase()) {
        case 'critical':
            return EventSeverity.CRITICAL;
        case 'warning':
            return EventSeverity.HIGH;
        case 'info':
            return EventSeverity.MEDIUM;
        default:
            return EventSeverity.LOW;
    }
}


export async function POST(request: NextRequest) {
    try {
        const payload: AlertManagerPayload = await request.json();
        
        console.log('Received Alertmanager webhook:', JSON.stringify(payload, null, 2));        
        
        // Получаем всех пользователей (в нашем случае один админ)
        const users = await user.findMany({});
        if (!users.length) {
            console.warn('No users found to send notifications');
            return NextResponse.json({ message: 'No users found' }, { status: 200 });
        }

        // Обрабатываем каждый алерт
        for (const alert of payload.alerts) {
            // Определяем серьезность события на основе severity алерта
            const eventSeverity = mapAlertSeverityToEventSeverity(alert.labels.severity);
            const eventType = determineEventType(alert);
            // Создаем событие для каждого пользователя
            for (const currentUser of users) {
                try {
                    await event.create({
                        userId: currentUser.id,
                        type: eventType,
                        severity: eventSeverity,
                        title: `${alert.labels.alertname} - ${alert.status.toUpperCase()}`,
                        message: alert.annotations.description || alert.annotations.summary || 'No description available',
                        isRead: false
                    });
                    
                    console.log(`Event created for user ${currentUser.id}:`, alert.labels.alertname);
                } catch (eventError) {
                    console.error(`Failed to create event for user ${currentUser.id}:`, eventError);
                }
            }

            // Проверяем правила уведомлений для каждого пользователя
            for (const currentUser of users) {
                try {
                    // Получаем правила пользователя
                    const userRules = await alertRulesManager['alertRulesService'].getUserRules(currentUser.id);
                    
                    // Проверяем каждое правило
                    for (const rule of userRules) {
                        if (!rule.enabled) continue;
                        
                        // Проверяем соответствие правила алерту
                        const ruleMatches = checkRuleMatches(rule, alert);
                        
                        if (ruleMatches) {
                            console.log(`Rule ${rule.name} matches alert ${alert.labels.alertname}`);
                            
                            // Отправляем уведомления согласно настройкам правила
                            await sendNotifications(currentUser.id, alert, rule);
                        }
                    }
                } catch (ruleError) {
                    console.error(`Failed to process rules for user ${currentUser.id}:`, ruleError);
                }
            }
        }

        return NextResponse.json({ 
            message: 'Alerts processed successfully',
            processed: payload.alerts.length 
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error processing Alertmanager webhook:', error);
        return NextResponse.json(
            { error: 'Internal server error' }, 
            { status: 500 }
        );
    }
}



// Функция для проверки соответствия правила алерту
function checkRuleMatches(rule: any, alert: any): boolean {
    // Проверяем severity
    if (rule.severity && rule.severity !== alert.labels.severity) {
        return false;
    }
    // Проверяем metric (alertname)
    if (rule.metric && rule.metric !== alert.labels.alertname) {
        return false;
    }

    // Проверяем threshold с оператором
    if (rule.threshold !== null && rule.operator && alert.annotations.value) {
        const alertValue = parseFloat(alert.annotations.value);
            if (isNaN(alertValue) || !compareValues(alertValue, rule.threshold, rule.operator)) {
                return false;
            }
    }

    
    if (rule.labels) {
        try {
            const ruleLabels = typeof rule.labels === 'string' ? JSON.parse(rule.labels) : rule.labels;
            for (const [key, value] of Object.entries(ruleLabels)) {
                if (alert.labels[key] !== value) {
                    return false;
                }
            }
        } catch (error) {
            console.error('Error parsing rule labels:', error);
            return false;
        }
    }
    
    return true;
}

function compareValues(alertValue: number, threshold: number, operator: string): boolean {
    switch (operator) {
        case 'GREATER_THAN': return alertValue > threshold;
        case 'LESS_THAN': return alertValue < threshold;
        case 'GREATER_EQUAL': return alertValue >= threshold;
        case 'LESS_EQUAL': return alertValue <= threshold;
        case 'EQUAL': return alertValue === threshold;
        case 'NOT_EQUAL': return alertValue !== threshold;
        default: return false;
    }
}

// Функция для отправки уведомлений
async function sendNotifications(userId: string, alert: any, rule: any) {
    try {
        // Получаем настройки уведомлений пользователя
        const notificationSettings = await notification_settings.findByUserId(userId);
        
        if (!notificationSettings) {
            console.log(`No notification settings found for user ${userId}`);
            return;
        }

        // Отправляем Email уведомление
        if (notificationSettings.siteNotification) {
            try {
                const user = await services.data.user.findById(userId);
                if (user?.email) {
                    const emailHtml = generateAlertEmailHtml(alert);
                    const emailText = alert.annotations.description || alert.annotations.summary || 'Alert notification';
                    await notificationFactory.email.send({
                        to: user.email,
                        subject: `Alert: ${alert.labels.alertname}`,
                        text: emailText,
                        html: emailHtml
                    });
                    console.log(`Email sent to ${user.email} for alert ${alert.labels.alertname}`);
                }
            } catch (emailError) {
                console.error('Failed to send email notification:', emailError);
            }
        }

        // Отправляем Telegram уведомление
        if (notificationSettings.telegramNotification) {
            try {
                const telegramSettings = await telegram_settings.findByUserId(userId);
                if (telegramSettings?.telegramChatId) {
                    const telegramText = generateAlertTelegramText(alert);
                    await notificationFactory.telegram.send({
                        chatId: telegramSettings.telegramChatId,
                        userId: userId, // Обязательное поле
                        text: telegramText
                    });
                    console.log(`Telegram message sent to ${telegramSettings.telegramChatId} for alert ${alert.labels.alertname}`);
                }
            } catch (telegramError) {
                console.error('Failed to send Telegram notification:', telegramError);
            }
        }
        
    } catch (error) {
        console.error('Error in sendNotifications:', error);
    }
}