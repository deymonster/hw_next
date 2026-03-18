'use server'

import { http } from 'follow-redirects'

// Need a way to talk to unix socket, node's native http supports it

const AGENT_SOCKET_PATH = '/app/agent.sock'

interface AgentResponse {
	success: boolean
	message?: string
	error?: string
}

async function callAgent(
	path: string,
	method: string = 'POST'
): Promise<AgentResponse> {
	return new Promise(resolve => {
		const options = {
			socketPath: AGENT_SOCKET_PATH,
			path: path,
			method: method
		}

		const req = http.request(
			options,
			(res: NodeJS.ReadableStream & { statusCode?: number }) => {
				let data = ''
				res.on('data', (chunk: Buffer | string) => {
					data += chunk.toString()
				})
				res.on('end', () => {
					try {
						if (
							res.statusCode &&
							res.statusCode >= 200 &&
							res.statusCode < 300
						) {
							const json = JSON.parse(data)
							resolve(json)
						} else {
							// Try to parse error from body if json
							try {
								const json = JSON.parse(data)
								resolve({
									success: false,
									error:
										json.error || `Status ${res.statusCode}`
								})
							} catch {
								resolve({
									success: false,
									error: `Agent returned status ${res.statusCode}: ${data}`
								})
							}
						}
					} catch (e) {
						resolve({
							success: false,
							error: `Failed to parse agent response: ${e instanceof Error ? e.message : String(e)}`
						})
					}
				})
			}
		)

		req.on('error', (e: Error) => {
			resolve({
				success: false,
				error: `Agent communication error: ${e.message}. Is the agent running and socket mapped?`
			})
		})

		req.end()
	})
}

export async function checkUpdate() {
	try {
		console.log('[UPDATE] Check update requested')
		const result = await callAgent('/check-update', 'GET')

		// If message is "Update available", return true
		if (result.success && result.message === 'Update available') {
			return { success: true, updateAvailable: true }
		}

		return { success: true, updateAvailable: false }
	} catch (error) {
		console.error('[UPDATE] Check failed:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error)
		}
	}
}
