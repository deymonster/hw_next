export interface AlertManagerPayload {
	version: string // Версия формата уведомлений
	groupKey: string // Уникальный идентификатор группы алертов
	status: 'firing' | 'resolved' // Статус группы алертов
	receiver: string // Имя получателя из конфигурации
	groupLabels: Record<string, string> // Метки, использованные для группировки
	commonLabels: Record<string, string> // Общие метки для всех алертов в группе
	commonAnnotations: Record<string, string> // Общие аннотации для всех алертов
	externalURL: string // URL AlertManager'а
	alerts: Alert[] // Массив алертов
}

export interface Alert {
	status: 'firing' | 'resolved'
	labels: {
		alertname: string // Имя алерта
		instance: string // Инстанс, где сработал алерт
		job: string // Имя job'а в Prometheus
		severity: 'critical' | 'warning' | 'info' // Важность
		[key: string]: string // Другие метки
	}
	annotations: {
		description: string // Описание алерта
		summary?: string // Краткое описание
		[key: string]: string | undefined // Другие аннотации
	}
	startsAt: string // Время начала алерта
	endsAt: string // Время завершения (для resolved)
	generatorURL: string // URL, где можно посмотреть метрику
	fingerprint: string // Уникальный идентификатор алерта
}
