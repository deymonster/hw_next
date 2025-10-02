import { NextResponse } from 'next/server'
import * as path from 'path'

import * as fs from 'fs/promises'

export async function POST(request: Request) {
	try {
		const body = await request.json()

		const { type, data } = body || {}
		if (type !== 'alerts') {
			return NextResponse.json(
				{ success: false, error: 'Unsupported type' },
				{ status: 400 }
			)
		}

		const { filename, content } = data || {}
		if (!filename || typeof content !== 'string') {
			return NextResponse.json(
				{ success: false, error: 'Invalid payload' },
				{ status: 400 }
			)
		}

		const rulesPath =
			process.env.PROMETHEUS_RULES_PATH || './prometheus/alerts'
		const filePath = path.join(rulesPath, filename)

		await fs.mkdir(rulesPath, { recursive: true })
		await fs.writeFile(filePath, content, 'utf8')

		return NextResponse.json({ success: true, path: filePath })
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		)
	}
}
