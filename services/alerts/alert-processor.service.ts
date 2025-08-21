import { EventSeverity, EventType } from '@prisma/client'

import { services } from '@/services'
import {
	Alert,
	AlertManagerPayload
} from '@/services/notifications/alermanager.types'
import {
	generateAlertEmailHtml,
	generateAlertTelegramText
} from '@/services/notifications/templates/alert.template'

export class AlertProcessorService {
	// Определение типа события
	determineEventType(alert: Alert): EventType {
		const alertName = alert.labels.alertname?.toLowerCase() || ''

		if (
			alertName.includes('hardware') ||
			alertName.includes('disk') ||
			alertName.includes('memory')
		) {
			return EventType.DEVICE
		}

		if (alertName.includes('system') || alertName.includes('service')) {
			return EventType.SYSTEM
		}

		if (alert.labels.severity === 'info') {
			return EventType.INFO
		}

		return EventType.ALERT
	}

	// Маппинг серьезности
	mapAlertSeverityToEventSeverity(alertSeverity: string): EventSeverity {
		switch (alertSeverity?.toLowerCase()) {
			case 'critical':
				return EventSeverity.CRITICAL
			case 'warning':
				return EventSeverity.HIGH
			case 'info':
				return EventSeverity.MEDIUM
			default:
				return EventSeverity.LOW
		}
	}

	// Получение русской темы письма в зависимости от типа алерта
	private getAlertSubjectInRussian(alert: Alert): string {
		// Проверяем категорию алерта
		if (
			alert.labels.alertname === 'Hardware_Change_Detected' ||
			alert.labels.category === 'hardware_change'
		) {
			return 'Обнаружено изменение конфигурации оборудования'
		}

		// Проверяем другие категории по alertname или category
		const alertName = alert.labels.alertname?.toLowerCase() || ''
		const category = alert.labels.category?.toUpperCase() || ''

		if (
			category === 'PERFORMANCE' ||
			alertName.includes('performance') ||
			alertName.includes('cpu') ||
			alertName.includes('memory') ||
			alertName.includes('disk')
		) {
			return 'Предупреждение о производительности системы'
		}

		if (
			category === 'HEALTH' ||
			alertName.includes('health') ||
			alertName.includes('service') ||
			alertName.includes('system')
		) {
			return 'Предупреждение о состоянии системы'
		}

		// Проверяем серьезность алерта
		const severity = alert.labels.severity?.toLowerCase() || ''
		if (severity === 'critical') {
			return `Критическое предупреждение: ${alert.labels.alertname}`
		} else if (severity === 'warning') {
			return `Важное предупреждение: ${alert.labels.alertname}`
		} else if (severity === 'info') {
			return `Информационное сообщение: ${alert.labels.alertname}`
		}

		// Для всех остальных алертов используем общую тему с названием алерта
		return `Уведомление системы мониторинга: ${alert.labels.alertname}`
	}

	// Проверка соответствия правила алерту
	checkRuleMatches(rule: any, alert: Alert): boolean {
		// Проверяем severity
		if (
			rule.severity &&
			rule.severity.toLowerCase() !== alert.labels.severity?.toLowerCase()
		) {
			return false
		}

		// Проверяем metric (alertname)
		if (rule.metric && rule.metric !== alert.labels.alertname) {
			return false
		}

		// Проверяем threshold с оператором
		if (
			rule.threshold !== null &&
			rule.threshold !== undefined &&
			rule.operator &&
			alert.annotations.value
		) {
			const alertValue = parseFloat(alert.annotations.value)
			if (
				isNaN(alertValue) ||
				!this.compareValues(alertValue, rule.threshold, rule.operator)
			) {
				return false
			}
		}

		// Проверяем дополнительные условия из rule.labels
		if (rule.labels) {
			try {
				const ruleLabels =
					typeof rule.labels === 'string'
						? JSON.parse(rule.labels)
						: rule.labels
				for (const [key, value] of Object.entries(ruleLabels)) {
					if (alert.labels[key] !== value) {
						return false
					}
				}
			} catch (error) {
				console.error('Error parsing rule labels:', error)
				return false
			}
		}

		return true
	}

	// Сравнение значений
	private compareValues(
		alertValue: number,
		threshold: number,
		operator: string
	): boolean {
		if (isNaN(alertValue) || isNaN(threshold)) {
			return false
		}

		switch (operator) {
			case 'GREATER_THAN':
				return alertValue > threshold
			case 'LESS_THAN':
				return alertValue < threshold
			case 'GREATER_EQUAL':
				return alertValue >= threshold
			case 'LESS_EQUAL':
				return alertValue <= threshold
			case 'EQUAL':
				return alertValue === threshold
			case 'NOT_EQUAL':
				return alertValue !== threshold
			default:
				return false
		}
	}

	// Создание события
	async createEvent(userId: string, alert: Alert) {
		const eventType = this.determineEventType(alert)
		const eventSeverity = this.mapAlertSeverityToEventSeverity(
			alert.labels.severity
		)

		// Получаем исходное сообщение
		let message =
			alert.annotations?.description ||
			alert.annotations?.summary ||
			'No description available'
		// Удаляем порт из IP-адреса в сообщении "Рабочее место: IP:PORT"
		message = message.replace(
			/Рабочее место: ([\d\.]+):\d+/g,
			'Рабочее место: $1'
		)

		return await services.data.event.create({
			userId,
			type: eventType,
			severity: eventSeverity,
			title: `${alert.labels?.alertname || 'Unknown Alert'} - ${alert.status?.toUpperCase() || 'UNKNOWN'}`,
			message: message,
			isRead: false,
			deviceId: null, 
			hardwareChangeConfirmed: false 
		})
	}

	// Отправка уведомлений
	async sendNotifications(userId: string, alert: Alert, rule: any) {
		const notificationSettings =
			await services.data.notification_settings.findByUserId(userId)

		if (!notificationSettings) {
			return
		}

		// Email уведомление
		if (notificationSettings.siteNotification) {
			const user = await services.data.user.findById(userId)
			if (user?.email) {
				const emailHtml = generateAlertEmailHtml(alert)
				const emailText =
					alert.annotations?.description ||
					alert.annotations?.summary ||
					'Alert notification'

				// Получаем русскую тему письма в зависимости от типа алерта
				const emailSubject = this.getAlertSubjectInRussian(alert)

				await services.infrastructure.notifications.email.send({
					to: user.email,
					subject: emailSubject,
					text: emailText,
					html: emailHtml
				})
			}
		}

		// Telegram уведомление
		if (notificationSettings.telegramNotification) {
			const telegramSettings =
				await services.data.telegram_settings.findByUserId(userId)
			if (telegramSettings?.telegramChatId) {
				const telegramText = generateAlertTelegramText(alert)
				await services.infrastructure.notifications.telegram.send({
					chatId: telegramSettings.telegramChatId,
					userId: userId,
					text: telegramText
				})
			}
		}
	}

	// Основная функция обработки
	async processAlerts(payload: AlertManagerPayload) {
		const users = await services.data.user.findMany({})
		if (!users.length) {
			throw new Error('No users found')
		}

		for (const alert of payload.alerts) {
			// Создаем события для всех пользователей
			for (const user of users) {
				await this.createEvent(user.id, alert)
			}

			// Проверяем правила уведомлений
			for (const user of users) {
				const userRules = await services.alertRulesManager[
					'alertRulesService'
				].getUserRules(user.id)

				for (const rule of userRules) {
					if (!rule.enabled) continue
					console.log(`[DEBUG] Checking rule:`, rule)
					console.log(`[DEBUG] Alert:`, alert)
					if (this.checkRuleMatches(rule, alert)) {
						console.log(`[DEBUG] Rule matches alert:`, rule)
						await this.sendNotifications(user.id, alert, rule)
					}
				}
			}
		}
	}
}
