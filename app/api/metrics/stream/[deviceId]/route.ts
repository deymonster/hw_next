/**
 * Модуль обработки Server-Sent Events (SSE) для стриминга метрик устройства
 * @module MetricsStreamRoute
 */

import { services } from '@/services'
import { NextRequest } from 'next/server'

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
 * 
 * Этот обработчик:
 * 1. Устанавливает SSE соединение с клиентом
 * 2. Отправляет статические данные устройства сразу при подключении
 * 3. Подписывается на обновления динамических метрик
 * 4. Отправляет обновления метрик клиенту по мере их поступления
 * 5. Корректно закрывает соединение при отключении клиента
 * 
 * @param {NextRequest} request - Объект запроса Next.js
 * @param {Object} params - Параметры маршрута
 * @param {string} params.deviceId - Идентификатор устройства
 * @returns {Promise<Response>} SSE стрим или ответ с ошибкой
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { deviceId: string } }
) {
    const { deviceId } = params
    const prometheusService = services.infrastructure.prometheus

    console.log('[SSE] Starting stream for device:', deviceId)

    // Инициализация SSE стрима
    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Флаг для отслеживания состояния соединения
    let isConnectionClosed = false

    /**
     * Отправляет метрики клиенту через SSE
     * @param {DeviceMetrics} metrics - Метрики для отправки
     */
    const sendMetrics = async (metrics: DeviceMetrics) => {
        if (isConnectionClosed) {
            return
        }

        try {
            const data = `data: ${JSON.stringify(metrics, null, 2)}\n\n`
            await writer.write(encoder.encode(data))
        } catch (error) {
            console.error('[SSE] Error sending metrics:', error)
            // Если ошибка связана с записью, закрываем соединение
            if (error instanceof Error && 
                (error.message.includes('write after end') || 
                 error.message.includes('ECONNRESET'))) {
                await closeConnection()
            }
        }
    }

    /**
     * Закрывает соединение и освобождает ресурсы
     */
    const closeConnection = async () => {
        if (isConnectionClosed) {
            return
        }

        isConnectionClosed = true
        console.log('[SSE] Closing connection for device:', deviceId)

        try {
            // Отправляем последнее сообщение перед закрытием
            await sendMetrics({ 
                type: 'system', 
                data: { 
                    status: 'closing',
                    message: 'Connection closing',
                    timestamp: Date.now()
                } 
            })
        } catch (error) {
            console.error('[SSE] Error sending closing message:', error)
        }

        try {
            await writer.close()
        } catch (error) {
            console.error('[SSE] Error closing writer:', error)
        }
    }

    try {
        // Настраиваем обработчики закрытия соединения
        request.signal.addEventListener('abort', closeConnection)
        
        // Добавляем обработчик для неожиданного закрытия
        writer.closed
            .then(() => {
                console.log('[SSE] Writer closed for device:', deviceId)
                closeConnection()
            })
            .catch((error) => {
                console.error('[SSE] Writer closed with error:', error)
                closeConnection()
            })

        // Отправляем начальное сообщение для проверки соединения
        await sendMetrics({ 
            type: 'system', 
            data: { 
                status: 'connected',
                message: 'SSE connection established',
                timestamp: Date.now()
            } 
        })

        // Получаем и отправляем статические данные
        try {
            const staticData = await prometheusService.getDeviceStaticData(deviceId)
            await sendMetrics({ type: 'static', data: staticData })
        } catch (error) {
            console.error('[SSE] Error getting static data:', error)
            await sendMetrics({ 
                type: 'error', 
                data: { 
                    message: 'Failed to get static data',
                    timestamp: Date.now()
                } 
            })
        }

        // Подписываемся на обновления динамических метрик
        const unsubscribe = prometheusService.subscribe(deviceId, async (metrics) => {
            if (!isConnectionClosed) {
                await sendMetrics({ type: 'dynamic', data: metrics })
            }
        })

        // Добавляем cleanup при закрытии соединения
        request.signal.addEventListener('abort', () => {
            unsubscribe()
        })

        // Возвращаем SSE стрим
        return new Response(stream.readable, {
            headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'X-Accel-Buffering': 'no'
            },
        })
    } catch (error) {
        console.error('[SSE] Error setting up stream:', error)
        await closeConnection()
        
        return new Response(
            JSON.stringify({ 
                error: 'Failed to setup metrics stream',
                message: error instanceof Error ? error.message : 'Unknown error'
            }), 
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
            }
        )
    }
} 