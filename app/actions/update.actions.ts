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
	return new Promise((resolve, reject) => {
		const options = {
			socketPath: AGENT_SOCKET_PATH,
			path: path,
			method: method
		}

		const req = http.request(options, (res: any) => {
			let data = ''
			res.on('data', (chunk: any) => {
				data += chunk
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
								error: json.error || `Status ${res.statusCode}`
							})
						} catch {
							resolve({
								success: false,
								error: `Agent returned status ${res.statusCode}: ${data}`
							})
						}
					}
				} catch (e: any) {
					resolve({
						success: false,
						error: `Failed to parse agent response: ${e.message}`
					})
				}
			})
		})

		req.on('error', (e: any) => {
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
		// In a real scenario, we might ask the agent to check for updates without applying them
		// For now, we'll just check if the agent is alive
		const health = await callAgent('/health', 'GET')
		if (!health.success) {
			return {
				success: false,
				error: 'Agent not reachable: ' + health.error
			}
		}
		return { success: true, hasUpdate: true, message: 'Ready to update' }
	} catch (error: any) {
		console.error('[UPDATE] Check failed:', error)
		return { success: false, error: error.message }
	}
}

export async function updateSystem() {
	try {
		console.log('[UPDATE] Update requested via UI')
		const result = await callAgent('/update', 'POST')
		return result
	} catch (error: any) {
		console.error('[UPDATE] Update failed:', error)
		return { success: false, error: error.message }
	}
}
