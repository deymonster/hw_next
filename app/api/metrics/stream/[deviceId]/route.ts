/**
 * Модуль обработки Server-Sent Events (SSE) для стриминга метрик устройства
 * @module MetricsStreamRoute
 */
import { NextRequest } from 'next/server'

import { services } from '@/services'

// Общие CORS заголовки
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Max-Age': '86400' // 24 часа
}

/**
 * OPTIONS обработчик для CORS preflight запросов
 */
export async function OPTIONS(request: NextRequest) {
	console.log('[OPTIONS] Получен preflight запрос')
	return new Response(null, {
		status: 204,
		headers: {
			...corsHeaders,
			'Access-Control-Allow-Origin': request.headers.get('origin') || '*'
		}
	})
}

/**
 * GET обработчик для SSE стрима метрик устройства
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ deviceId: string }> }
) {
	console.log('[SSE] Начало обработки GET запроса')

	const { deviceId } = await params
	console.log('[SSE] Получен deviceId:', deviceId)

	// Создаем ReadableStream напрямую
	const stream = new ReadableStream({
		start: async controller => {
			console.log('[SSE] Stream started')

			try {
				const encoder = new TextEncoder()

				// Указываем клиенту интервал реконнекта (на случай разрыва)
				controller.enqueue(encoder.encode(`retry: 5000\n\n`))

				// Отправляем начальное сообщение
				const initialMessage = `data: ${JSON.stringify({
					type: 'system',
					data: {
						status: 'connected',
						message: 'SSE connection established',
						timestamp: Date.now()
					}
				})}\n\n`
				controller.enqueue(encoder.encode(initialMessage))

				// 1) СНАЧАЛА подписываемся на динамические метрики (чтобы не ждать статику)
				const unsubscribe =
					services.infrastructure.prometheus.subscribe(
						deviceId,
						metrics => {
							try {
								const message = `data: ${JSON.stringify({
									type: 'dynamic',
									data: metrics
								})}\n\n`
								controller.enqueue(encoder.encode(message))
							} catch (error) {
								console.error(
									'[SSE] Error sending metrics:',
									error
								)
							}
						}
					)

				// Heartbeat, чтобы соединение не буферизовалось и не простаивало
				const heartbeatId = setInterval(() => {
					try {
						controller.enqueue(encoder.encode(`: ping\n\n`))
					} catch (e) {
						console.error('[SSE] Heartbeat error:', e)
						clearInterval(heartbeatId)
					}
				}, 15000)

				// 2) ПАРАЛЛЕЛЬНО загружаем статические данные (не блокируя динамику)
				;(async () => {
					try {
						// Сообщаем клиенту, что ждем статику
						const waitingMsg = `data: ${JSON.stringify({
							type: 'system',
							data: {
								status: 'waiting_static',
								message:
									'Waiting for static metrics to be available'
							}
						})}\n\n`
						controller.enqueue(encoder.encode(waitingMsg))

						// Ждем появления STATIC-метрик с ретраями
						const available =
							await services.infrastructure.prometheus.waitForMetricsAvailability(
								deviceId,
								10,
								2000
							)

						if (request.signal.aborted) return

						const sendStatic = async () => {
							const staticData =
								await services.infrastructure.prometheus.getDeviceStaticData(
									deviceId
								)
							const staticMessage = `data: ${JSON.stringify({
								type: 'static',
								data: staticData
							})}\n\n`
							controller.enqueue(encoder.encode(staticMessage))
						}

						if (available) {
							await sendStatic()
						} else {
							// Сообщаем о длительном ожидании и продолжаем фоново ретраить,
							// чтобы прислать статику, как только она появится
							const infoMessage = `data: ${JSON.stringify({
								type: 'system',
								data: {
									status: 'waiting_static_retry',
									message:
										'Static metrics not available yet, will keep retrying in background'
								}
							})}\n\n`
							controller.enqueue(encoder.encode(infoMessage))
							;(async () => {
								while (!request.signal.aborted) {
									try {
										await sendStatic()
										break
									} catch {
										// подождать и попробовать снова
										await new Promise(r =>
											setTimeout(r, 5000)
										)
									}
								}
							})()
						}
					} catch (error) {
						console.error('[SSE] Error getting static data:', error)
						const errorMessage = `data: ${JSON.stringify({
							type: 'error',
							data: {
								message: 'Failed to get static data',
								error:
									error instanceof Error
										? error.message
										: String(error),
								timestamp: Date.now()
							}
						})}\n\n`
						controller.enqueue(encoder.encode(errorMessage))
					}
				})()

				// Очистка при закрытии соединения
				request.signal.addEventListener('abort', () => {
					unsubscribe()
					clearInterval(heartbeatId)
					controller.close()
				})
			} catch (error) {
				console.error('[SSE] Stream error:', error)
				controller.error(error)
			}
		}
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': '*'
		}
	})
}
