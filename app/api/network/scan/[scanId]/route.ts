import Redis from 'ioredis'
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

import { services } from '@/services'
import { LoggerService } from '@/services/logger/logger.interface'
import {
	networkScanJobChannelPrefix,
	networkScanJobKeyPrefix,
	type NetworkScanJobState,
	networkScanQueue,
	readJobState
} from '@/services/network-scanner/network-scan.queue'
import redisClient from '@/services/redis/client'

const createSubscriber = () =>
	process.env.REDIS_URL
		? new Redis(process.env.REDIS_URL)
		: new Redis({
				host: process.env.REDIS_HOST || 'localhost',
				port: Number(process.env.REDIS_PORT) || 6379,
				password: process.env.REDIS_PASSWORD
			})

export const dynamic = 'force-dynamic'

async function authorize(request: NextRequest) {
	const token = await getToken({
		req: request,
		secret: process.env.NEXTAUTH_SECRET,
		cookieName: 'authjs.session-token',
		secureCookie: process.env.NODE_ENV === 'production'
	})

	if (!token?.id) {
		return null
	}

	return token
}

export async function GET(
	request: NextRequest,
	{ params }: { params: { scanId: string } }
) {
	const token = await authorize(request)
	if (!token) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const { scanId } = params

	if (request.headers.get('accept') === 'text/event-stream') {
		const stream = new ReadableStream({
			start(controller) {
				const subscriber = createSubscriber()
				const channel = `${networkScanJobChannelPrefix}${scanId}`

				const sendEvent = (payload: Partial<NetworkScanJobState>) => {
					controller.enqueue(
						`data: ${JSON.stringify({ scanId, ...payload })}\n\n`
					)
				}

				subscriber.subscribe(channel, err => {
					if (err) {
						controller.error(err)
					}
				})

				subscriber.on('message', (ch, message) => {
					if (ch === channel) {
						sendEvent(JSON.parse(message))
					}
				})

				readJobState(scanId).then(state => {
					if (state) {
						sendEvent(state)
					}
				})

				const onAbort = () => {
					subscriber.unsubscribe(channel)
					subscriber.quit()
					controller.close()
				}

				request.signal.addEventListener('abort', onAbort)
			},
			cancel() {}
		})
		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		})
	}

	const state = await readJobState(scanId)
	if (!state) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	return NextResponse.json({ scanId, ...state })
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { scanId: string } }
) {
	const token = await authorize(request)
	if (!token) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const { scanId } = params
	const state = await readJobState(scanId)

	if (!state) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(state.status)) {
		return NextResponse.json(
			{ error: 'Scan already finished' },
			{ status: 409 }
		)
	}

	await networkScanQueue.cancel(scanId)
	await services.infrastructure.logger.warn(
		LoggerService.NETWORK_SCANNER,
		'Job cancelled',
		{
			jobId: scanId,
			userId: token.id
		}
	)
	await redisClient.del(`${networkScanJobKeyPrefix}${scanId}`)

	return NextResponse.json({ status: 'CANCELLED', scanId })
}
