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
	} catch (error: any) {
		console.error('Database check failed:', error)
		return NextResponse.json(
			{
				isValid: false,
				missingTables: [],
				error: error.message || 'Ошибка при проверке базы данных'
			},
			{ status: 500 }
		)
	}
}
