import { NextRequest } from 'next/server';
import { WebSocketServer, WebSocket } from 'ws';
import { services } from '@/services';
import http from 'http';
import { PrometheusParser } from '@/services/prometheus/prometheus.parser';
import { MetricType } from '@/services/prometheus/metrics';
import { LoggerService } from '@/services/logger/logger.interface';

interface NodeError extends Error {
  code?: string;
}

// Global variables for WebSocket server management
const wsConnections = new Map<string, Set<WebSocket>>();
let wsServer: WebSocketServer | null = null;
let httpServer: http.Server | null = null;
let isServerStarted = false;

declare global {
  var wsServerInitialized: boolean;
}

// Function to terminate all connections and cleanup servers
function cleanupWebSocketServer() {
  if (wsServer) {
    wsConnections.forEach(connections => {
      connections.forEach(ws => {
        try {
          ws.terminate(); // Force close any hanging connections
          ws.close();
        } catch (error) {
          services.infrastructure.logger.error(LoggerService.APP, '[WS] Error closing connection:', error);
        }
      });
    });
    wsConnections.clear();
    
    try {
      wsServer.close(() => {
        services.infrastructure.logger.info(LoggerService.APP, '[WS] WebSocket server closed');
      });
      if (httpServer) {
        httpServer.close(() => {
          services.infrastructure.logger.info(LoggerService.APP, '[WS] HTTP server closed');
        });
      }
    } catch (error) {
      services.infrastructure.logger.error(LoggerService.APP, '[WS] Error closing servers:', error);
    }
    
    wsServer = null;
    httpServer = null;
    isServerStarted = false;
  }
}

function initWebSocketServer(): WebSocketServer | null {
  // Clean up existing server if running
  if (isServerStarted) {
    cleanupWebSocketServer();
  }

  try {
    httpServer = http.createServer();
    
    httpServer.on('error', (err: NodeError) => {
      services.infrastructure.logger.error(LoggerService.APP, '[WS] Server error:', err);
      if (err.code === 'EADDRINUSE') {
        services.infrastructure.logger.warn(LoggerService.APP, '[WS] Port 3001 is in use, cleaning up...');
        cleanupWebSocketServer();
        return null;
      }
    });

    wsServer = new WebSocketServer({ noServer: true });
    
    wsServer.on('connection', (ws: WebSocket, req: any) => {
      const url = new URL(req.url || '', 'http://localhost');
      const pathParts = url.pathname.split('/');
      const deviceId = pathParts[pathParts.length - 1];

      // Close existing connections for this device
      const existingConnections = wsConnections.get(deviceId);
      if (existingConnections) {
        existingConnections.forEach(connection => {
          if (connection !== ws && connection.readyState === WebSocket.OPEN) {
            try {
              connection.terminate();
              connection.close();
            } catch (error) {
              services.infrastructure.logger.error(LoggerService.APP, '[WS] Error closing existing connection:', error);
            }
          }
        });
        wsConnections.delete(deviceId);
      }

      // Set up new connection
      wsConnections.set(deviceId, new Set([ws]));
      services.infrastructure.logger.info(LoggerService.APP, `[WS] New connection established for device ${deviceId}`);

      let interval: NodeJS.Timeout;

      // Handle client connection errors
      ws.on('error', (error) => {
        services.infrastructure.logger.error(LoggerService.APP, `[WS] Client error for device ${deviceId}:`, error);
        clearInterval(interval);
        try {
          ws.terminate();
        } catch (e) {
          services.infrastructure.logger.error(LoggerService.APP, '[WS] Error terminating connection:', e);
        }
      });

      // Set up metrics interval
      interval = setInterval(async () => {
        if (ws.readyState !== WebSocket.OPEN) {
          clearInterval(interval);
          return;
        }

        try {
          const response = await services.infrastructure.prometheus.getMetricsByIp(
            deviceId,
            MetricType.PROCESS
          );
          
          if (response?.data?.result) {
            services.infrastructure.logger.debug(LoggerService.APP, '[WS] Raw process metrics:', response.data.result);
            const parser = new PrometheusParser(response);
            const processes = await parser.getProcessList();
            services.infrastructure.logger.debug(LoggerService.APP, '[WS] Parsed processes:', processes);
            ws.send(JSON.stringify(processes));
          } else {
            services.infrastructure.logger.warn(LoggerService.APP, `[WS] No process data for device ${deviceId}`);
          }
        } catch (error) {
          services.infrastructure.logger.error(LoggerService.APP, '[WS] Metrics fetch error:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ error: 'Failed to fetch metrics' }));
          }
        }
      }, 5000);

      // Cleanup on connection close
      ws.on('close', () => {
        services.infrastructure.logger.info(LoggerService.APP, `[WS] Connection closed for device ${deviceId}`);
        clearInterval(interval);
        
        const deviceConnections = wsConnections.get(deviceId);
        if (deviceConnections) {
          deviceConnections.delete(ws);
          if (deviceConnections.size === 0) {
            wsConnections.delete(deviceId);
          }
        }
      });
    });

    // Set up upgrade handling
    httpServer.on('upgrade', (request, socket, head) => {
      wsServer?.handleUpgrade(request, socket, head, (ws) => {
        wsServer?.emit('connection', ws, request);
      });
    });

    // Start the server
    httpServer.listen(3001, () => {
      services.infrastructure.logger.info(LoggerService.APP, '[WS] Server started on port 3001');
      isServerStarted = true;
    });

    return wsServer;
  } catch (error) {
    services.infrastructure.logger.error(LoggerService.APP, '[WS] Server initialization error:', error);
    cleanupWebSocketServer();
    return null;
  }
}

// Initialize server once
if (typeof global !== 'undefined' && !global.wsServerInitialized) {
  initWebSocketServer();
  global.wsServerInitialized = true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;
  
  if (!deviceId) {
    return new Response(JSON.stringify({ error: 'Device ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await services.infrastructure.prometheus.getMetricsByIp(deviceId, MetricType.PROCESS);
  } catch (error) {
    services.infrastructure.logger.error(LoggerService.APP, `[WS] Prometheus connection error for device ${deviceId}:`, error);
    return new Response(JSON.stringify({ 
      error: 'Failed to connect to metrics service',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!isServerStarted) {
    initWebSocketServer();
  }
  
  const host = request.headers.get('host') || 'localhost:3000';
  const serverHost = host.split(':')[0];
  
  return new Response(JSON.stringify({
    message: 'WebSocket server is running',
    connection: `ws://${serverHost}:3001/api/metrics/processes/${deviceId}`
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}