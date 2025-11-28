import { NetworkScanStatus, Prisma, PrismaClient } from '@prisma/client'

export class NetworkScanJobService {
	constructor(private readonly prisma: PrismaClient) {}

	createJob(data: {
		id: string
		status: NetworkScanStatus
		progress?: number
		options?: Prisma.InputJsonValue | null
		userId?: string | null
	}) {
		return this.prisma.networkScanJob.create({
			data: {
				id: data.id,
				status: data.status,
				progress: data.progress ?? 0,
				options: data.options ?? undefined,
				userId: data.userId ?? undefined
			}
		})
	}

	updateJob(
		id: string,
		data: {
			status?: NetworkScanStatus
			progress?: number
			result?: unknown
			error?: string | null
			options?: Prisma.InputJsonValue | null
		}
	) {
		return this.prisma.networkScanJob.update({
			where: { id },
			data: {
				status: data.status,
				progress: data.progress,
				result: data.result as any,
				error: data.error ?? undefined,
				options: data.options ?? undefined
			}
		})
	}

	findJob(id: string) {
		return this.prisma.networkScanJob.findUnique({ where: { id } })
	}
}
