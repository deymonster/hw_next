'use client'

import { Activity, ArrowRight, BarChart2, Server, Shield } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
	const { loading } = useAuth()

	if (loading) {
		return (
			<div className='flex h-screen items-center justify-center'>
				<div className='h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary'></div>
			</div>
		)
	}

	// Для неавторизованных пользователей показываем привлекательную начальную страницу
	return (
		<div className='flex min-h-screen flex-col'>
			{/* Hero секция */}
			<section className='flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-6 text-center sm:p-10'>
				<div className='max-w-3xl'>
					<h1 className='mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl'>
						NITRINOnet Monitoring
					</h1>
					<p className='mb-6 text-xl text-muted-foreground'>
						Современная система мониторинга оборудования с
						интеграцией Prometheus
					</p>
					<div className='flex flex-wrap justify-center gap-4'>
						<Link href='/account/login'>
							<Button size='default' className='gap-2'>
								Войти в систему
								<ArrowRight className='h-4 w-4' />
							</Button>
						</Link>
						<Link href='/account/create'>
							<Button variant='outline' size='default'>
								Зарегистрироваться
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Секция с функциями */}
			<section className='bg-background py-12'>
				<div className='container mx-auto px-4'>
					<h2 className='mb-10 text-center text-3xl font-bold'>
						Основные возможности
					</h2>
					<div className='grid gap-8 sm:grid-cols-2 lg:grid-cols-4'>
						<FeatureCard
							icon={<Server className='h-10 w-10 text-primary' />}
							title='Мониторинг устройств'
							description='Отслеживайте состояние всех ваших устройств в реальном времени'
						/>
						<FeatureCard
							icon={
								<Activity className='h-10 w-10 text-primary' />
							}
							title='Правила оповещений'
							description='Настраивайте гибкие правила для своевременного оповещения о проблемах'
						/>
						<FeatureCard
							icon={
								<BarChart2 className='h-10 w-10 text-primary' />
							}
							title='Настраиваемые уведомления'
							description='Получайте уведомления о событиях через электронную почту или Telegram'
						/>
						<FeatureCard
							icon={<Shield className='h-10 w-10 text-primary' />}
							title='Интеграция с Prometheus'
							description='Полная интеграция с Prometheus для расширенного мониторинга'
						/>
					</div>
				</div>
			</section>

			{/* Футер */}
			<footer className='border-t bg-muted py-6'>
				<div className='container mx-auto flex justify-center text-sm text-muted-foreground'>
					&copy; {new Date().getFullYear()} NITRINOnet Monitoring. Все
					права защищены.
				</div>
			</footer>
		</div>
	)
}

// Компонент карточки функции
function FeatureCard({
	icon,
	title,
	description
}: {
	icon: React.ReactNode
	title: string
	description: string
}) {
	return (
		<div className='flex flex-col items-center rounded-lg border bg-card p-6 text-center shadow-sm transition-all hover:shadow-md'>
			<div className='mb-4'>{icon}</div>
			<h3 className='mb-2 text-xl font-medium'>{title}</h3>
			<p className='text-muted-foreground'>{description}</p>
		</div>
	)
}
