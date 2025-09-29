'use client'

import { AlertTriangle, Database, RefreshCw, Terminal } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'

interface DatabaseErrorProps {
	missingTables: string[]
	error?: string
	onRetry?: () => void
}

export function DatabaseError({
	missingTables,
	error,
	onRetry
}: DatabaseErrorProps) {
	const t = useTranslations('database.error')
	const [isRetrying, setIsRetrying] = useState(false)

	const handleRetry = async () => {
		if (!onRetry) return
		setIsRetrying(true)
		try {
			await onRetry()
		} finally {
			setIsRetrying(false)
		}
	}

	return (
		<div className='flex min-h-screen items-center justify-center bg-background p-4'>
			<Card className='w-full max-w-2xl'>
				<CardHeader className='text-center'>
					<div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10'>
						<Database className='h-6 w-6 text-destructive' />
					</div>
					<CardTitle className='text-2xl font-bold text-destructive'>
						{t('title')}
					</CardTitle>
					<CardDescription>
						Приложение не может запуститься из-за проблем с базой
						данных
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-6'>
					{error && (
						<Alert variant='destructive'>
							<AlertTriangle className='h-4 w-4' />
							<AlertTitle>{t('connectionFailed')}</AlertTitle>
							<AlertDescription>
								{error}
								<p className='mt-2'>
									{t('connectionDescription')}
								</p>
							</AlertDescription>
						</Alert>
					)}

					{missingTables.length > 0 && (
						<Alert variant='destructive'>
							<Database className='h-4 w-4' />
							<AlertTitle>{t('missingTables')}</AlertTitle>
							<AlertDescription>
								<p className='mb-2'>
									{t('missingTablesDescription')}
								</p>
								<ul className='list-inside list-disc space-y-1'>
									{missingTables.map(table => (
										<li
											key={table}
											className='font-mono text-sm'
										>
											{table}
										</li>
									))}
								</ul>
							</AlertDescription>
						</Alert>
					)}

					<div className='rounded-lg bg-muted p-4'>
						<h3 className='mb-2 flex items-center gap-2 font-semibold'>
							<Terminal className='h-4 w-4' />
							Как исправить:
						</h3>
						<ol className='list-inside list-decimal space-y-2 text-sm'>
							<li>
								Убедитесь, что база данных PostgreSQL запущена и
								доступна
							</li>
							<li>
								Проверьте переменную окружения{' '}
								<code className='rounded bg-background px-1'>
									DATABASE_URL
								</code>
							</li>
							<li>
								{t('migrationDescription')}
								<pre className='mt-1 overflow-x-auto rounded bg-background p-2'>
									<code>npx prisma migrate deploy</code>
								</pre>
							</li>
							<li>
								Если миграции не помогают, попробуйте сбросить
								базу данных:
								<pre className='mt-1 overflow-x-auto rounded bg-background p-2'>
									<code>npx prisma migrate reset</code>
								</pre>
							</li>
							<li>
								Если проблема не решается, обратитесь к
								администратору
							</li>
						</ol>
					</div>

					{onRetry && (
						<div className='flex justify-center'>
							<Button
								onClick={handleRetry}
								disabled={isRetrying}
								variant='outline'
							>
								{isRetrying ? (
									<>
										<RefreshCw className='mr-2 h-4 w-4 animate-spin' />
										{t('checking')}
									</>
								) : (
									<>
										<RefreshCw className='mr-2 h-4 w-4' />
										{t('checkAgain')}
									</>
								)}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
