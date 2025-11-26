import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

import { scanDeviceSchema } from '@/schemas/scan/scan.schema'

import { services } from '@/services'
import { LoggerService } from '@/services/logger/logger.interface'
import { networkScanQueue } from '@/services/network-scanner/network-scan.queue'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
	const token = await getToken({
		req: request,
		secret: process.env.NEXTAUTH_SECRET,
		cookieName: 'authjs.session-token',
		secureCookie: process.env.NODE_ENV === 'production'
	})

	if (!token?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const subnet =
		await services.infrastructure.network_scanner.getCurrentSubnet()
	return NextResponse.json({ subnet })
}

export async function POST(request: NextRequest) {
	const token = await getToken({
		req: request,
		secret: process.env.NEXTAUTH_SECRET,
		cookieName: 'authjs.session-token',
		secureCookie: process.env.NODE_ENV === 'production'
	})

	if (!token?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const body = await request.json().catch(() => null)
	const parsed = scanDeviceSchema.safeParse(body)

	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'Invalid options', details: parsed.error.flatten() },
			{ status: 400 }
		)
	}

	const jobId = networkScanQueue.generateJobId()
	const options = parsed.data

	await services.data.network_scan_job.createJob({
		id: jobId,
		status: 'QUEUED',
		progress: 0,
		options,
		userId: token.id
	})

	networkScanQueue.enqueue({ id: jobId, options, userId: token.id })

	await services.infrastructure.logger.info(
		LoggerService.NETWORK_SCANNER,
		'Network scan enqueued',
		{ jobId, userId: token.id, options }
	)

	return NextResponse.json({ scanId: jobId, status: 'QUEUED' })
}
