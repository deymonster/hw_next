const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
	const adminEmail = 'admin@local.host'
	const defaultPassword = 'admin'

	const existingAdmin = await prisma.user.findUnique({
		where: { email: adminEmail }
	})

	if (!existingAdmin) {
		const hashedPassword = await hash(defaultPassword, 10)
		await prisma.user.create({
			data: {
				email: adminEmail,
				name: 'Administrator',
				password: hashedPassword,
				role: 'ADMIN', // Prisma Role.ADMIN
				emailVerified: true
			}
		})
		console.log(
			`✅ Default admin created: ${adminEmail} / ${defaultPassword}`
		)
	} else {
		console.log(`ℹ️ Admin user already exists: ${adminEmail}`)
	}
}

main()
	.catch(e => {
		console.error('❌ Error seeding database:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
