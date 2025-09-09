import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

import fs from 'fs/promises'

// API для синхронизации конфигурации Prometheus
export async function POST(request: NextRequest) {
	try {
		const { type, data } = await request.json()

		const sharedConfigPath =
			process.env.PROMETHEUS_SHARED_CONFIG_PATH || '/shared-config'

		if (type === 'targets') {
			// Обновление targets
			const targetsPath = path.join(
				sharedConfigPath,
				'targets',
				'windows_targets.json'
			)
			await fs.writeFile(targetsPath, JSON.stringify(data, null, 2))
		} else if (type === 'alerts') {
			// Обновление alert rules
			const alertsPath = path.join(
				sharedConfigPath,
				'alerts',
				data.filename
			)
			await fs.writeFile(alertsPath, data.content)
		}

		// Перезагрузка конфигурации Prometheus через API
		const prometheusUrl =
			process.env.PROMETHEUS_INTERNAL_URL || 'http://prometheus:9090'
		const reloadResponse = await fetch(`${prometheusUrl}/-/reload`, {
			method: 'POST'
		})

		if (!reloadResponse.ok) {
			throw new Error(
				`Failed to reload Prometheus: ${reloadResponse.statusText}`
			)
		}

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Config sync error:', error)
		return NextResponse.json(
			{ error: 'Failed to sync configuration' },
			{ status: 500 }
		)
	}
}
