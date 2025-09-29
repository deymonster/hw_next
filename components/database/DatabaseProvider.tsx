'use client'

import { createContext, useContext, useEffect, useState } from 'react'

import { DatabaseError } from './DatabaseError'

import type { DatabaseCheckResult } from '@/libs/database-checker'

interface DatabaseContextType {
	isChecking: boolean
	isValid: boolean
	checkResult: DatabaseCheckResult | null
	recheckDatabase: () => Promise<void>
}

const DatabaseContext = createContext<DatabaseContextType | null>(null)

export function useDatabaseStatus() {
	const context = useContext(DatabaseContext)
	if (!context) {
		throw new Error(
			'useDatabaseStatus must be used within DatabaseProvider'
		)
	}
	return context
}

interface DatabaseProviderProps {
	children: React.ReactNode
	initialCheck?: DatabaseCheckResult
}

export function DatabaseProvider({
	children,
	initialCheck
}: DatabaseProviderProps) {
	const [isChecking, setIsChecking] = useState(!initialCheck)
	const [checkResult, setCheckResult] = useState<DatabaseCheckResult | null>(
		initialCheck || null
	)

	const checkDatabase = async () => {
		setIsChecking(true)
		try {
			const response = await fetch('/api/database/check')
			const result: DatabaseCheckResult = await response.json()
			setCheckResult(result)
		} catch (error) {
			console.error('Failed to check database:', error)
			setCheckResult({
				isValid: false,
				missingTables: [],
				error: 'Не удалось проверить состояние базы данных'
			})
		} finally {
			setIsChecking(false)
		}
	}

	const recheckDatabase = async () => {
		await checkDatabase()
	}

	useEffect(() => {
		if (!initialCheck) {
			checkDatabase()
		}
	}, [initialCheck])

	// Если база данных не валидна, показываем ошибку
	if (checkResult && !checkResult.isValid && !isChecking) {
		return (
			<DatabaseError
				missingTables={checkResult.missingTables}
				error={checkResult.error}
				onRetry={recheckDatabase}
			/>
		)
	}

	// Если проверка еще идет, показываем загрузку
	if (isChecking) {
		return (
			<div className='flex min-h-screen items-center justify-center'>
				<div className='text-center'>
					<div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary'></div>
					<p className='text-muted-foreground'>
						Проверяем базу данных...
					</p>
				</div>
			</div>
		)
	}

	const contextValue: DatabaseContextType = {
		isChecking,
		isValid: checkResult?.isValid ?? false,
		checkResult,
		recheckDatabase
	}

	return (
		<DatabaseContext.Provider value={contextValue}>
			{children}
		</DatabaseContext.Provider>
	)
}
