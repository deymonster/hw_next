export interface AlertManagerAlert {
	status: 'firing' | 'resolved'
	labels: Record<string, string>
	annotations: Record<string, string>
	startsAt: string
	endsAt: string
	generatorURL: string
}

export interface AlertManagerPayload {
	receiver: string
	status: 'firing' | 'resolved'
	alerts: AlertManagerAlert[]
	groupLabels: Record<string, string>
	commonLabels: Record<string, string>
	commonAnnotations: Record<string, string>
	externalURL: string
	version: string
	groupKey: string
}
