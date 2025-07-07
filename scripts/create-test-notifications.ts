import { EventSeverity, EventType, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
	// Получаем первого пользователя из БД для теста
	const user = await prisma.user.findFirst()

	if (!user) {
		console.error('No users found in database')
		return
	}

	// Создаем массив тестовых уведомлений
	const notifications = [
		{
			title: 'Welcome!',
			message:
				'Welcome to HW Monitor. Start monitoring your devices now.',
			type: EventType.SYSTEM,
			severity: EventSeverity.LOW,
			isRead: false,
			userId: user.id
		},
		{
			title: 'New Device Alert',
			message: 'Temperature sensor detected high CPU temperature',
			type: EventType.DEVICE,
			severity: EventSeverity.HIGH,
			isRead: false,
			userId: user.id
		},
		{
			title: 'Profile Updated',
			message: 'Your profile settings have been successfully updated',
			type: EventType.USER,
			severity: EventSeverity.LOW,
			isRead: false,
			userId: user.id
		},
		{
			title: 'Profile Updated',
			message: 'Your profile settings have been successfully updated',
			type: EventType.USER,
			severity: EventSeverity.LOW,
			isRead: false,
			userId: user.id
		},
		{
			title: 'Profile Updated',
			message: 'Your profile settings have been successfully updated',
			type: EventType.USER,
			severity: EventSeverity.LOW,
			isRead: false,
			userId: user.id
		},
		{
			title: 'Profile Updated',
			message: 'Your profile settings have been successfully updated',
			type: EventType.USER,
			severity: EventSeverity.LOW,
			isRead: false,
			userId: user.id
		},
		{
			title: 'Profile Updated',
			message: 'Your profile settings have been successfully updated',
			type: EventType.USER,
			severity: EventSeverity.LOW,
			isRead: false,
			userId: user.id
		}
	]

	// Создаем уведомления в БД
	for (const notification of notifications) {
		await prisma.event.create({
			data: notification
		})
	}

	console.log('Test notifications created successfully!')
}

main()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
