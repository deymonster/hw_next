import { Logger } from '../services/logger/logger.service'
import { LoggerService } from '../services/logger/logger.interface'

const logger = Logger.getInstance()

export const logAction = async (
  service: LoggerService,
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  ...meta: any[]
) => {
  await logger[level](service, message, ...meta)
}