/**
 * Модуль обработки Server-Sent Events (SSE) для стриминга метрик устройства
 * @module MetricsStreamRoute
 */

import { services } from '@/services'
import { NextRequest } from 'next/server'

// Общие CORS заголовки
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400' // 24 часа
}

// Общие заголовки для SSE
const sseHeaders = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
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
 * Интерфейс для типизации метрик устройства
 */
interface DeviceMetrics {
    /** Тип данных: статические или динамические */
    type: 'static' | 'dynamic' | 'system' | 'error'
    /** Данные метрик */
    data: {
        /** Системная информация (только для type='static') */
        systemInfo?: any
        /** Информация о железе (только для type='static') */
        hardwareInfo?: any
        /** Метрики процессора (только для type='dynamic') */
        processorMetrics?: any
        /** Метрики сети (только для type='dynamic') */
        networkMetrics?: any
        /** Метрики дисков (только для type='dynamic') */
        diskMetrics?: any
        /** Метрики памяти (только для type='dynamic') */
        memoryMetrics?: any
        /** Список процессов (только для type='dynamic') */
        processList?: any
        /** Временная метка получения данных */
        timestamp?: number
        /** Статус соединения (только для type='system') */
        status?: string
        /** Сообщение о состоянии (для type='system' и type='error') */
        message?: string
    }
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
        start: async (controller) => {
            console.log('[SSE] Stream started')
            
            try {
                // Отправляем начальное сообщение
                const initialMessage = `data: ${JSON.stringify({
                    type: 'system',
                    data: {
                        status: 'connected',
                        message: 'SSE connection established',
                        timestamp: Date.now()
                    }
                })}\n\n`
                
                controller.enqueue(new TextEncoder().encode(initialMessage))
                console.log('[SSE] Initial message sent')

                // Получаем статические данные
                try {
                    console.log('[SSE] Requesting static data for device:', deviceId)
                    const staticData = await services.infrastructure.prometheus.getDeviceStaticData(deviceId)
                    console.log('[SSE] Received static data:', staticData)
                    
                    const staticMessage = `data: ${JSON.stringify({
                        type: 'static',
                        data: staticData
                    })}\n\n`
                    controller.enqueue(new TextEncoder().encode(staticMessage))
                    console.log('[SSE] Static data sent successfully')
                } catch (error) {
                    console.error('[SSE] Error getting static data:', error)
                    const errorMessage = `data: ${JSON.stringify({
                        type: 'error',
                        data: {
                            message: 'Failed to get static data',
                            error: error instanceof Error ? error.message : String(error),
                            timestamp: Date.now()
                        }
                    })}\n\n`
                    controller.enqueue(new TextEncoder().encode(errorMessage))
                    console.log('[SSE] Error message sent to client')
                }

                // Подписываемся на обновления
                const unsubscribe = services.infrastructure.prometheus.subscribe(deviceId, (metrics) => {
                    try {
                        const message = `data: ${JSON.stringify({
                            type: 'dynamic',
                            data: metrics
                        })}\n\n`
                        controller.enqueue(new TextEncoder().encode(message))
                        console.log('[SSE] Dynamic metrics sent')
                    } catch (error) {
                        console.error('[SSE] Error sending metrics:', error)
                    }
                })

                // Очистка при закрытии соединения
                request.signal.addEventListener('abort', () => {
                    console.log('[SSE] Connection aborted')
                    unsubscribe()
                    controller.close()
                })

            } catch (error) {
                console.error('[SSE] Stream error:', error)
                controller.error(error)
            }
        }
    })

    // Возвращаем Response сразу
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*'
        }
    })
}