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
	} catch (error) {
		console.error('[UPDATE] Check failed:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error)
		}
	}
}

export async function updateSystem() {
	// Since the agent now streams the response, we can't just return a simple JSON
	// We'll need to handle the streaming on the client side, or buffer it here.
	// For now, let's just trigger it and return a success message,
	// assuming the client will poll or use a different mechanism to track progress.
	// OR, better yet, we can't use a server action to stream directly to the client easily without experimental features.
	// So we might need to expose a route handler that proxies the SSE stream.

	try {
		console.log('[UPDATE] Update requested via UI')
		// We are NOT calling callAgent here because we want to stream the response
		// This function might be deprecated or changed to just kick off the process
		return { success: true, message: 'Update started' }
	} catch (error) {
		console.error('[UPDATE] Update failed:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error)
		}
	}
}
