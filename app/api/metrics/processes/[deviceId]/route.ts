import http from 'http'
import { NextRequest } from 'next/server'
import { WebSocket, WebSocketServer } from 'ws'

import { services } from '@/services'
import { LoggerService } from '@/services/logger/logger.interface'
import { MetricType } from '@/services/prometheus/metrics'
import { ProcessListInfo } from '@/services/prometheus/prometheus.interfaces'
import { PrometheusParser } from '@/services/prometheus/prometheus.parser'

interface NodeError extends Error {
	code?: string
}

// Global variables for WebSocket server management
const wsConnections = new Map<string, Set<WebSocket>>()
let wsServer: WebSocketServer | null = null
let httpServer: http.Server | null = null
let isServerStarted = false

declare global {
	// eslint-disable-next-line no-var
	var wsServerInitialized: boolean
}

// Function to terminate all connections and cleanup servers
function cleanupWebSocketServer() {
	if (wsServer) {
		wsConnections.forEach(connections => {
			connections.forEach(ws => {
				try {
					ws.terminate() // Force close any hanging connections
					ws.close()
				} catch (error) {
					services.infrastructure.logger.error(
						LoggerService.APP,
						'[WS] Error closing connection:',
						error
					)
				}
			})
		})
		wsConnections.clear()

		try {
			wsServer.close(() => {
				services.infrastructure.logger.info(
					LoggerService.APP,
					'[WS] WebSocket server closed'
				)
			})
			if (httpServer) {
				httpServer.close(() => {
					services.infrastructure.logger.info(
						LoggerService.APP,
						'[WS] HTTP server closed'
					)
				})
			}
		} catch (error) {
			services.infrastructure.logger.error(
				LoggerService.APP,
				'[WS] Error closing servers:',
				error
			)
		}

		wsServer = null
		httpServer = null
		isServerStarted = false
	}
}

function initWebSocketServer(): WebSocketServer | null {
	// Clean up existing server if running
	if (isServerStarted) {
		cleanupWebSocketServer()
	}

	try {
		httpServer = http.createServer()

		httpServer.on('error', (err: NodeError) => {
			services.infrastructure.logger.error(
				LoggerService.APP,
				'[WS] Server error:',
				err
			)
			if (err.code === 'EADDRINUSE') {
				services.infrastructure.logger.warn(
					LoggerService.APP,
					'[WS] Port 3001 is in use, cleaning up...'
				)
				cleanupWebSocketServer()
				return null
			}
			return undefined
		})

		wsServer = new WebSocketServer({ noServer: true })

		wsServer.on(
			'connection',
			(ws: WebSocket, req: http.IncomingMessage) => {
				const url = new URL(req.url || '', 'http://localhost')
				const pathParts = url.pathname.split('/')
				const deviceId = pathParts[pathParts.length - 1]

				// Close existing connections for this device
				const existingConnections = wsConnections.get(deviceId)
				if (existingConnections) {
					existingConnections.forEach(connection => {
						if (
							connection !== ws &&
							connection.readyState === WebSocket.OPEN
						) {
							try {
								connection.terminate()
								connection.close()
							} catch (error) {
								services.infrastructure.logger.error(
									LoggerService.APP,
									'[WS] Error closing existing connection:',
									error
								)
							}
						}
					})
					wsConnections.delete(deviceId)
				}

				// Set up new connection
				wsConnections.set(deviceId, new Set([ws]))
				services.infrastructure.logger.info(
					LoggerService.APP,
					`[WS] New connection established for device ${deviceId}`
				)
				// eslint-disable-next-line prefer-const
				let interval: NodeJS.Timeout

				// Сразу отправим кэш, если он свежий (например, не старше 10 секунд)
				const cached = processesCache.get(deviceId)
				if (cached && Date.now() - cached.updatedAt < 10_000) {
					try {
						ws.send(JSON.stringify(cached.data))
					} catch (e) {
						services.infrastructure.logger.warn(
							LoggerService.APP,
							'[WS] Failed to send cached processes:',
							e
						)
					}
				}

				// Помощник: единичная выборка + рассылка всем клиентам устройства
				const fetchAndBroadcast = async () => {
					if (fetchingFlag.get(deviceId)) return
					fetchingFlag.set(deviceId, true)
					try {
						const response =
							await services.infrastructure.prometheus.getMetricsByIp(
								deviceId,
								MetricType.PROCESS
							)

						if (response?.data?.result) {
							const parser = new PrometheusParser(response)
							const processes = await parser.getProcessList()

							// Обновляем кэш
							processesCache.set(deviceId, {
								data: processes,
								updatedAt: Date.now()
							})

							// Рассылаем всем активным подключениям устройства
							const deviceConnections =
								wsConnections.get(deviceId)
							if (deviceConnections) {
								for (const client of deviceConnections) {
									if (client.readyState === WebSocket.OPEN) {
										try {
											client.send(
												JSON.stringify(processes)
											)
										} catch (e) {
											services.infrastructure.logger.warn(
												LoggerService.APP,
												'[WS] Send to client failed:',
												e
											)
										}
									}
								}
							}
						} else {
							services.infrastructure.logger.warn(
								LoggerService.APP,
								`[WS] No process data for device ${deviceId}`
							)
						}
					} catch (error) {
						services.infrastructure.logger.error(
							LoggerService.APP,
							'[WS] Metrics fetch error:',
							error
						)
						// Отправим ошибку только текущему клиенту
						if (ws.readyState === WebSocket.OPEN) {
							ws.send(
								JSON.stringify({
									error: 'Failed to fetch metrics'
								})
							)
						}
					} finally {
						fetchingFlag.set(deviceId, false)
					}
				}

				// Моментальная первая выборка, чтобы убрать «холодный старт»
				fetchAndBroadcast().catch(() => {})

				// Handle client connection errors
				ws.on('error', error => {
					services.infrastructure.logger.error(
						LoggerService.APP,
						`[WS] Client error for device ${deviceId}:`,
						error
					)
					clearInterval(interval)
					try {
						ws.terminate()
					} catch (e) {
						services.infrastructure.logger.error(
							LoggerService.APP,
							'[WS] Error terminating connection:',
							e
						)
					}
				})

				// Обновляем процессы чаще и без накладок
				interval = setInterval(async () => {
					if (ws.readyState !== WebSocket.OPEN) {
						clearInterval(interval)
						return
					}
					await fetchAndBroadcast()
				}, 3000)

				// Cleanup on connection close
				ws.on('close', () => {
					services.infrastructure.logger.info(
						LoggerService.APP,
						`[WS] Connection closed for device ${deviceId}`
					)
					clearInterval(interval)

					const deviceConnections = wsConnections.get(deviceId)
					if (deviceConnections) {
						deviceConnections.delete(ws)
						if (deviceConnections.size === 0) {
							wsConnections.delete(deviceId)
						}
					}
				})
			}
		)

		// Set up upgrade handling
		httpServer.on('upgrade', (request, socket, head) => {
			wsServer?.handleUpgrade(request, socket, head, ws => {
				wsServer?.emit('connection', ws, request)
			})
		})

		// Start the server
		httpServer.listen(3001, () => {
			services.infrastructure.logger.info(
				LoggerService.APP,
				'[WS] Server started on port 3001'
			)
			isServerStarted = true
		})

		return wsServer
	} catch (error) {
		services.infrastructure.logger.error(
			LoggerService.APP,
			'[WS] Server initialization error:',
			error
		)
		cleanupWebSocketServer()
		return null
	}
}

// Initialize server once
if (typeof global !== 'undefined' && !global.wsServerInitialized) {
	initWebSocketServer()
	global.wsServerInitialized = true
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ deviceId: string }> }
) {
	const { deviceId } = await params

	if (!deviceId) {
		return new Response(
			JSON.stringify({ error: 'Device ID is required' }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		)
	}

	try {
		await services.infrastructure.prometheus.getMetricsByIp(
			deviceId,
			MetricType.PROCESS
		)
	} catch (error) {
		services.infrastructure.logger.error(
			LoggerService.APP,
			`[WS] Prometheus connection error for device ${deviceId}:`,
			error
		)
		return new Response(
			JSON.stringify({
				error: 'Failed to connect to metrics service',
				details: error instanceof Error ? error.message : String(error)
			}),
			{
				status: 503,
				headers: { 'Content-Type': 'application/json' }
			}
		)
	}

	if (!isServerStarted) {
		initWebSocketServer()
	}

        const forwardedProto = request.headers.get('x-forwarded-proto')
        const forwardedHost = request.headers.get('x-forwarded-host')
        const requestHost = request.headers.get('host')

        const host = forwardedHost || requestHost || 'localhost'
        const protocol =
                forwardedProto || request.nextUrl.protocol.replace(':', '') || 'http'

        const wsProtocol = protocol === 'https' ? 'wss' : 'ws'

        const connectionUrl = new URL(
                `/api/metrics/processes/${deviceId}`,
                `${wsProtocol}://${host}`
        ).toString()

	return new Response(
		JSON.stringify({
			message: 'WebSocket server is running',
                        connection: connectionUrl
                }),
                {
			headers: { 'Content-Type': 'application/json' }
		}
	)
}

// Простая in-memory кэшизация последних процессов по устройству
const processesCache = new Map<
	string,
	{ data: ProcessListInfo; updatedAt: number }
>()
// Флаг для предотвращения наложения выборок на одно устройство
const fetchingFlag = new Map<string, boolean>()
