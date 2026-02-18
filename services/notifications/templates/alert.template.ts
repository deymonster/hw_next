import { Alert } from '../alermanager.types'

// Helper for consistent date formatting
const formatDate = (dateString: string) => {
	try {
		return new Date(dateString).toLocaleString('ru-RU', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		})
	} catch (e) {
		return dateString
	}
}

export function generateAlertEmailHtml(alert: Alert): string {
	// Проверяем, является ли это алертом о смене оборудования
	const isHardwareChange =
		alert.labels.alertname === 'Hardware_Change_Detected' ||
		alert.labels.category === 'hardware_change'

	// Русские заголовки
	const statusText = 'Статус'
	const severityText = 'Приоритет'
	const descriptionText = 'Описание'
	const instanceText = isHardwareChange ? 'Устройство' : 'Рабочее место'
	const timeText = 'Время события'
	const generatedText = 'Сгенерировано системой HW Monitor'

	// Русские значения
	const statusValue =
		alert.status.toUpperCase() === 'FIRING' ? 'АКТИВЕН' : 'УСТРАНЕН'

	const severityValue =
		alert.labels.severity.toUpperCase() === 'CRITICAL'
			? 'КРИТИЧЕСКАЯ'
			: alert.labels.severity.toUpperCase() === 'WARNING'
				? 'ПРЕДУПРЕЖДЕНИЕ'
				: alert.labels.severity.toUpperCase()

	// Заголовок
	const alertTitle = isHardwareChange
		? '⚠️ Изменение конфигурации оборудования'
		: `🚨 ${alert.labels.alertname}`

	const color = getSeverityColor(alert.labels.severity)

	return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="background-color: ${color}; padding: 20px; color: white;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 600;">
                    ${alertTitle}
                </h2>
            </div>
            
            <div style="padding: 24px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                    <div>
                        <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">${statusText}</div>
                        <div style="font-size: 16px; font-weight: bold; color: ${alert.status === 'firing' ? '#d32f2f' : '#388e3c'}; margin-top: 4px;">${statusValue}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">${severityText}</div>
                        <div style="font-size: 16px; font-weight: bold; color: ${color}; margin-top: 4px;">${severityValue}</div>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">${descriptionText}</div>
                    <div style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; border-left: 3px solid ${color}; font-size: 14px; line-height: 1.5;">
                        ${alert.annotations.description?.replace(/\n/g, '<br>') || 'Нет описания'}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">${instanceText}</div>
                        <div style="font-size: 14px; font-weight: 500; margin-top: 4px;">${alert.labels.instance || 'Неизвестно'}</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">${timeText}</div>
                        <div style="font-size: 14px; font-weight: 500; margin-top: 4px;">${formatDate(alert.startsAt)}</div>
                    </div>
                </div>

                ${
					alert.status === 'resolved'
						? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                    <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Время устранения</div>
                    <div style="font-size: 14px; font-weight: 500; margin-top: 4px;">${formatDate(alert.endsAt)}</div>
                </div>`
						: ''
				}
            </div>

            <div style="background-color: #f8f9fa; padding: 12px 24px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #eee;">
                ${generatedText} • ${formatDate(new Date().toISOString())}
            </div>
        </div>
    `
}

export function generateAlertTelegramText(alert: Alert): string {
	const isHardwareChange =
		alert.labels.alertname === 'Hardware_Change_Detected' ||
		alert.labels.category === 'hardware_change'

	const alertTitle = isHardwareChange
		? '⚠️ <b>Изменение конфигурации</b>'
		: `🚨 <b>${alert.labels.alertname}</b>`

	const statusValue =
		alert.status.toUpperCase() === 'FIRING' ? '🔴 АКТИВЕН' : '🟢 УСТРАНЕН'

	const severityValue =
		alert.labels.severity.toUpperCase() === 'CRITICAL'
			? 'КРИТИЧЕСКАЯ'
			: alert.labels.severity.toUpperCase() === 'WARNING'
				? 'ПРЕДУПРЕЖДЕНИЕ'
				: alert.labels.severity.toUpperCase()

	// Используем HTML для форматирования в Telegram (поддерживается большинством ботов)
	return `
${alertTitle}

<b>Статус:</b> ${statusValue}
<b>Приоритет:</b> ${severityValue}
<b>Рабочее место:</b> <code>${alert.labels.instance || 'Неизвестно'}</code>
<b>Время:</b> ${formatDate(alert.startsAt)}
${alert.status === 'resolved' ? `<b>Устранено:</b> ${formatDate(alert.endsAt)}\n` : ''}
<b>Описание:</b>
${alert.annotations.description}
`.trim()
}

function getSeverityColor(severity: string): string {
	switch (severity.toLowerCase()) {
		case 'critical':
			return '#dc3545'
		case 'warning':
			return '#ffc107'
		default:
			return '#17a2b8'
	}
}
