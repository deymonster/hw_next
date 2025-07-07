import { NextRequest, NextResponse } from 'next/server'

import { AlertProcessorService } from '@/services/alerts/alert-processor.service'
import { AlertManagerPayload } from '@/services/notifications/alermanager.types'

const alertProcessor = new AlertProcessorService()

export async function POST(request: NextRequest) {
	try {
		const payload: AlertManagerPayload = await request.json()

		console.log(
			'Received Alertmanager webhook:',
			JSON.stringify(payload, null, 2)
		)

		// Обрабатываем алерты через сервис
		await alertProcessor.processAlerts(payload)

		return NextResponse.json(
			{
				message: 'Alerts processed successfully',
				processed: payload.alerts.length
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error('Error processing Alertmanager webhook:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}
