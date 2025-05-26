'use server'

/**
 * @fileoverview Серверные actions для работы с сервисом Prometheus при создании инвентаризации
 * @author Dmitriy Popov <deymonster@gmail.com>
 * @module InventoryPrometheus
 */

import { services } from '@/services'


/**
 * Интерфейс ответа для серверных actions
 * @interface ActionResponse
 * @template T - Тип данных в ответе
 */
interface ActionResponse<T = any> {
  /** Флаг успешности выполнения */
  success: boolean
  /** Данные в случае успешного выполнения */
  data?: T
  /** Сообщение об ошибке в случае неудачи */
  error?: string
}

/**
 * Получает статическую информацию об устройстве
 * 
 * @param {string} deviceId - IP-адрес или идентификатор устройства
 * @returns {Promise<ActionResponse>} Объект с результатом операции
 * 
 * @example
 * // Получение информации об устройстве
 * const response = await getDeviceInfo('192.168.1.100');
 * if (response.success) {
 *   const { systemInfo, hardwareInfo } = response.data;
 *   // Обработка данных
 * } else {
 *   console.error(response.error);
 * }
 */
export async function getDeviceInfo(deviceId: string): Promise<ActionResponse> {
  try {
    // Проверка входных данных
    if (!deviceId) {
      return {
        success: false,
        error: 'Не указан идентификатор устройства'
      }
    }

    console.log(`[InventoryPrometheus] Запрос информации об устройстве: ${deviceId}`)
    
    // Получение статических данных через сервис Prometheus
    const staticData = await services.infrastructure.prometheus.getDeviceStaticData(deviceId)
    
    // Проверка полученных данных
    if (!staticData) {
      return {
        success: false,
        error: 'Не удалось получить информацию об устройстве'
      }
    }

    console.log(`[PrometheusActions] Успешно получена информация об устройстве: ${deviceId}`)
    
    // Возвращаем успешный результат с данными
    return {
      success: true,
      data: staticData
    }
  } catch (error) {
    // Логирование ошибки
    console.error(`[PrometheusActions] Ошибка при получении информации об устройстве ${deviceId}:`, error)
    
    // Возвращаем информацию об ошибке
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }
  }
}

