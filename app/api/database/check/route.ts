import { NextResponse } from 'next/server'

import { checkDatabaseTables, getMigrationInfo } from '@/libs/database-checker'

export async function GET() {
	try {
		const [checkResult, migrationInfo] = await Promise.all([
			checkDatabaseTables(),
			getMigrationInfo().catch(() => null)
		])

		return NextResponse.json({
			...checkResult,
			migrationInfo
		})
	} catch (error: unknown) {
		console.error('Database check failed:', error)
		const message =
			error instanceof Error
				? error.message
				: 'Ошибка при проверке базы данных'
		return NextResponse.json(
			{
				isValid: false,
				missingTables: [],
				error: message
			},
			{ status: 500 }
		)
	}
}
