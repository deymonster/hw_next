import { prisma } from './prisma'

export interface DatabaseCheckResult {
	isValid: boolean
	missingTables: string[]
	error?: string
}

// Список обязательных таблиц из схемы Prisma
const REQUIRED_TABLES = [
	'User',
	'Event',
	'NotificationSettings',
	'TelegramSettings',
	'SmtpSettings',
	'Device',
	'Employee',
	'Department',
	'Inventory',
	'InventoryItem',
	'AlertRule',
	// Добавляем несуществующую таблицу в тестовом режиме
	...(process.env.NODE_ENV === 'development' &&
	process.env.TEST_DB_CHECK === 'true'
		? ['TestTable']
		: [])
]

/**
 * Проверяет наличие всех необходимых таблиц в базе данных
 */
export async function checkDatabaseTables(): Promise<DatabaseCheckResult> {
	try {
		const missingTables: string[] = []

		// Проверяем каждую таблицу
		for (const tableName of REQUIRED_TABLES) {
			try {
				// Для тестовой таблицы сразу добавляем в missing
				if (tableName === 'TestTable') {
					missingTables.push(tableName)
					continue
				}

				// Пытаемся выполнить простой запрос к таблице
				await (prisma as any)[tableName.toLowerCase()].findFirst({
					take: 1
				})
			} catch (error: any) {
				// Если таблица не существует, Prisma выбросит ошибку
				if (
					error.code === 'P2021' ||
					error.message.includes('does not exist')
				) {
					missingTables.push(tableName)
				} else {
					// Если это другая ошибка, логируем её
					console.warn(
						`Warning checking table ${tableName}:`,
						error.message
					)
				}
			}
		}

		return {
			isValid: missingTables.length === 0,
			missingTables
		}
	} catch (error: any) {
		console.error('Database connection error:', error)
		return {
			isValid: false,
			missingTables: [],
			error: error.message || 'Ошибка подключения к базе данных'
		}
	}
}

/**
 * Проверяет подключение к базе данных
 */
export async function checkDatabaseConnection(): Promise<boolean> {
	try {
		await prisma.$queryRaw`SELECT 1`
		return true
	} catch (error) {
		console.error('Database connection failed:', error)
		return false
	}
}

/**
 * Получает информацию о миграциях
 */
export async function getMigrationInfo() {
	try {
		// Проверяем таблицу миграций Prisma
		const migrations = (await prisma.$queryRaw`
			SELECT * FROM "_prisma_migrations" 
			ORDER BY "finished_at" DESC 
			LIMIT 10
		`) as any[]

		return {
			hasMigrations: migrations.length > 0,
			lastMigration: migrations[0],
			totalMigrations: migrations.length
		}
	} catch (error: any) {
		// Если таблица миграций не существует
		if (
			error.code === 'P2021' ||
			error.message.includes('_prisma_migrations')
		) {
			return {
				hasMigrations: false,
				lastMigration: null,
				totalMigrations: 0,
				error: 'Таблица миграций не найдена'
			}
		}
		throw error
	}
}
