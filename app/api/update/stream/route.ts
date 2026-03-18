import http from 'http'
import { NextRequest, NextResponse } from 'next/server'

// We need to use the Node.js http client because we are connecting to a unix socket
const AGENT_SOCKET_PATH = '/app/agent.sock'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
	const encoder = new TextEncoder()

	// Create a transform stream to pass data from the socket to the response
	const stream = new TransformStream()
	const writer = stream.writable.getWriter()

	const options = {
		socketPath: AGENT_SOCKET_PATH,
		path: '/update',
		method: 'POST'
	}

	// We initiate the request to the agent
	const agentReq = http.request(options, res => {
		res.on('data', async chunk => {
			// Pass the chunk directly to the client
			// The chunk from agent is already formatted as SSE if agent is doing it right
			// But agent outputs raw SSE strings. We need to write them to the stream.
			// Since chunk is Buffer, we write it directly.
			try {
				await writer.write(chunk)
			} catch (e) {
				console.error('Error writing chunk:', e)
			}
		})

		res.on('end', async () => {
			try {
				await writer.close()
			} catch {
				// Ignore close errors
			}
		})

		res.on('error', async err => {
			console.error('Agent response error:', err)
			try {
				await writer.write(
					encoder.encode(`event: error\ndata: ${err.message}\n\n`)
				)
				await writer.close()
			} catch {
				// Ignore errors
			}
		})
	})

	agentReq.on('error', async err => {
		console.error('Agent request error:', err)
		try {
			await writer.write(
				encoder.encode(`event: error\ndata: ${err.message}\n\n`)
			)
			await writer.close()
		} catch {
			// Ignore errors
		}
	})

	agentReq.end()

	return new NextResponse(stream.readable, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	})
}
