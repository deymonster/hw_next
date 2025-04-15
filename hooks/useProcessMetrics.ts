import { useState, useEffect, useRef } from 'react';

export interface ProcessInfo {
  name: string;
  instances: number;
  memory: number;
  cpu: number;
}

export interface ProcessListData {
  processes: ProcessInfo[];
  total: number;
}

interface ProcessMetricsState {
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  data: ProcessListData | null;
  lastUpdated: number | null;
}



// Глобальное хранилище для WebSocket URL по deviceId
const webSocketUrls = new Map<string, string>();

/**
 * Хук для получения метрик процессов через WebSocket
 * @param deviceId ID устройства для мониторинга
 * @returns Состояние соединения и данные о процессах
 */
export function useProcessMetrics(deviceId: string) {
  const [state, setState] = useState<ProcessMetricsState>({
    isLoading: true,
    isConnected: false,
    error: null,
    data: null,
    lastUpdated: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef<boolean>(false)

  // Инициализация WebSocket соединения
  const initializeWebSocket = async () => {
    if (initializingRef.current) return;

    initializingRef.current = true;

    try {
      // Проверяем, есть ли уже URL для этого устройства
      let wsUrl = webSocketUrls.get(deviceId);

      // Если URL нет, делаем HTTP запрос для инициализации
      if (!wsUrl) {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const response = await fetch(`/api/metrics/processes/${deviceId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to initialize WebSocket server');
        }
        
        const data = await response.json();
        wsUrl = data.connection;
        
        // Проверяем, что URL определен, прежде чем сохранять его
        if (wsUrl) {
            // Сохраняем URL для будущих подключений
            webSocketUrls.set(deviceId, wsUrl);
        } else {
            throw new Error('WebSocket URL is undefined');
        }
      }

      // Создаем WebSocket соединение
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Обработчики событий WebSocket
      ws.onopen = () => {
        setState(prev => ({ ...prev, isConnected: true, isLoading: false, error: null }));
        initializingRef.current = false;
      };
      
      ws.onmessage = (event) => {
        try {

          const data = JSON.parse(event.data);          
          setState(prev => ({ 
            ...prev, 
            data, 
            lastUpdated: Date.now(),
            isLoading: false
          }));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'WebSocket connection error', 
          isConnected: false 
        }));
      };
      
      ws.onclose = () => {
        setState(prev => ({ ...prev, isConnected: false }));
        
        // Пытаемся переподключиться через 5 секунд
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (document.visibilityState !== 'hidden') {
            initializeWebSocket();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        isLoading: false,
        isConnected: false
      }));

      initializingRef.current = false;
      
      // Пытаемся переподключиться через 10 секунд при ошибке
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          initializeWebSocket();
        }
      }, 10000);
    }
  };

  // Инициализация соединения при монтировании компонента
  useEffect(() => {
    if (deviceId) {
      initializeWebSocket();
    }
    
    // Переподключение при возвращении на вкладку
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wsRef.current?.OPEN) {
        initializeWebSocket();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Очистка при размонтировании
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [deviceId]);

  // Функция для принудительного переподключения
  const reconnect = () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    initializeWebSocket();
  };

  return {
    ...state,
    reconnect
  };
}