/**
 * API эндпоинт для получения метрик процессов через WebSocket
 * 
 * Этот эндпоинт создает WebSocket сервер на порту 3001 и позволяет
 * клиентам подключаться для получения информации о процессах в реальном времени.
 * 
 * URL для подключения: ws://localhost:3001/api/metrics/processes/{deviceId}
 * 
 * @example
 * // Пример использования на клиенте:
 * const ws = new WebSocket('ws://localhost:3001/api/metrics/processes/192.168.1.100');
 * ws.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Получены данные о процессах:', data);
 * };
 */
import { NextRequest } from 'next/server';
import { WebSocketServer, WebSocket } from 'ws';
import { services } from '@/services';
import http from 'http';
import { PrometheusParser } from '@/services/prometheus/prometheus.parser';
import { MetricType } from '@/services/prometheus/metrics';
import { LoggerService } from '@/services/logger/logger.interface';

// Типизация для ошибок с кодом
interface NodeError extends Error {
  code?: string;
}

// Глобальные переменные для предотвращения дублирования серверов при горячей перезагрузке
const wsConnections = new Map<string, Set<WebSocket>>();
let wsServer: WebSocketServer | null = null;
let httpServer: http.Server | null = null;
let isServerStarted = false;

// Используем глобальный объект для отслеживания инициализации сервера
declare global {
  var wsServerInitialized: boolean;
}

/**
 * Инициализирует WebSocket сервер, если он еще не создан
 * @returns {WebSocketServer | null} Экземпляр WebSocket сервера или null при ошибке
 */
function initWebSocketServer(): WebSocketServer | null {
  // Если сервер уже инициализирован и запущен, возвращаем его
  if (wsServer && isServerStarted) return wsServer;

  try {
    // Создаем HTTP сервер только если он еще не существует
    if (!httpServer) {
      httpServer = http.createServer();
      
      // Обработка ошибок HTTP сервера
      httpServer.on('error', (err: NodeError) => {
        console.error('WebSocket server error:', err);
        if (err.code === 'EADDRINUSE') {
          console.log('Port 3001 is already in use. Not starting a new server instance.');
          isServerStarted = true;
          return null;
        }
      });
    }
    
    // Создаем WebSocket сервер только если он еще не существует
    if (!wsServer) {
      wsServer = new WebSocketServer({ noServer: true });
      
      // Настраиваем обработчик подключений
      wsServer.on('connection', (ws: WebSocket, req: any) => {
        // Извлекаем deviceId из URL
        const url = new URL(req.url || '', 'http://localhost');
        const pathParts = url.pathname.split('/');
        const deviceId = pathParts[pathParts.length - 1];
        
        services.infrastructure.logger.info(LoggerService.APP, `[WS] Process metrics connection opened for device ${deviceId}`);
        
        // Сохраняем соединение в Map для данного устройства
        if (!wsConnections.has(deviceId)) {
          wsConnections.set(deviceId, new Set());
        }
        const connections = wsConnections.get(deviceId);
        if (connections) {
          connections.add(ws);
        }
        
        // Создаем интервал для отправки метрик процессов
        const interval = setInterval(async () => {
          try {
            // Получаем метрики процессов через PrometheusService
            const response = await services.infrastructure.prometheus.getMetricsByIp(
              deviceId,
              MetricType.PROCESS
            );
            
            if (response && response.data && response.data.result) {
              
              
              const parser = new PrometheusParser(response);
              const processes = await parser.getProcessList();

              services.infrastructure.logger.debug(LoggerService.APP, '[WS] Parsed processes:', {
                total: processes.total,
                sampleProcess: processes.processes[0]
              });


              // Отправляем данные через WebSocket если соединение активно
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(processes));
              }
            } else {
              services.infrastructure.logger.error(LoggerService.APP, '[WS] Failed to fetch process metrics for ' + deviceId + ':', []);
            }
          } catch (error) {
            services.infrastructure.logger.error(LoggerService.APP, '[WS] Error fetching process metrics:', error);
          }
        }, 5000); // Обновляем каждые 5 секунд
        
        // Очистка при закрытии соединения
        ws.on('close', () => {
          services.infrastructure.logger.info(LoggerService.APP, `[WS] Process metrics connection closed for device ${deviceId}`);
          clearInterval(interval);
          
          // Удаляем соединение из списка
          const deviceConnections = wsConnections.get(deviceId);
          if (deviceConnections) {
            deviceConnections.delete(ws);
            if (deviceConnections.size === 0) {
              wsConnections.delete(deviceId);
            }
          }
        });
      });
    }
    
    // Пытаемся запустить сервер только если он еще не запущен
    if (!isServerStarted) {
      // Настраиваем обработку upgrade для WebSocket
      httpServer.on('upgrade', (request, socket, head) => {
        wsServer?.handleUpgrade(request, socket, head, (ws) => {
          wsServer?.emit('connection', ws, request);
        });
      });
      
      // Запускаем сервер с обработкой ошибок
      httpServer.listen(3001, () => {
        console.log('WebSocket server is running on port 3001');
        isServerStarted = true;
      });
    }
    
    return wsServer;
  } catch (error) {
    console.error('Failed to initialize WebSocket server:', error);
    return null;
  }
}

// Инициализируем сервер только один раз в глобальном контексте
if (typeof global !== 'undefined' && !global.wsServerInitialized) {
  initWebSocketServer();
  global.wsServerInitialized = true;
}

/**
 * Обработчик GET запросов к API эндпоинту
 * @param {NextRequest} request - Объект запроса Next.js
 * @param {Object} params - Параметры маршрута
 * @returns {Response} Ответ с информацией о WebSocket сервере
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;
  
  // Проверяем, что deviceId существует
  if (!deviceId) {
    return new Response(JSON.stringify({ error: 'Device ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Проверяем, что сервис Prometheus доступен
  try {
    await services.infrastructure.prometheus.getMetricsByIp(deviceId, MetricType.PROCESS);
  } catch (error) {
    console.error(`Failed to connect to Prometheus for device ${deviceId}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      error: 'Failed to connect to metrics service',
      details: errorMessage
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Инициализируем WebSocket сервер если необходимо
  if (typeof global !== 'undefined' && !global.wsServerInitialized) {
    initWebSocketServer();
    global.wsServerInitialized = true;
  }
  
  // Получаем IP адрес сервера
  const host = request.headers.get('host') || 'localhost:3000';
  const serverHost = host.split(':')[0];
  
  // Возвращаем информацию о WebSocket сервере
  return new Response(JSON.stringify({
    message: 'WebSocket server is running',
    connection: `ws://${serverHost}:3001/api/metrics/processes/${deviceId}`,
    documentation: {
      description: 'WebSocket API для получения метрик процессов в реальном времени',
      messageFormat: {
        type: 'processes',
        data: {
          total: 'Общее количество процессов',
          processes: [
            {
              name: 'Имя процесса',
              pid: 'ID процесса',
              cpuUsage: 'Использование CPU в процентах',
              memoryUsage: 'Использование памяти в байтах'
            }
          ]
        },
        timestamp: 'Время отправки сообщения (Unix timestamp)',
        fetchTimeMs: 'Время получения данных в миллисекундах'
      },
      updateInterval: '5000 мс (5 секунд)'
    }
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}