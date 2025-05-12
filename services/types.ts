// services/types.ts
import { UserService } from './user.service'
import { EventService } from './event.service'
import { SmtpSettingsService } from './smtp-settings/smtp-settings.service'
import { TelegramSettingsService } from './telegram-settings/telegram-settings.service'
import { NotificationSettingsService } from './notification-settings/notification-settings.service'
import { DeviceService } from './device/device.service'
import { NetworkScannerService } from './network-scanner/network-scanner.service'
import { PrometheusService } from './prometheus/prometheus.service'
import { CacheService } from './cache/cache.service'
import { NotificationFactory } from './notifications/notification.factory'
import { ILoggerService } from './logger/logger.interface'
import { DepartmentService } from './department/department.service'
import { EmployeeService } from './employee/employee.service'
import { InventoryService } from './inventory/inventory.service'



// Сервисы для работы с данными
export interface IDataServices {
    user: UserService
    event: EventService
    smtp_settings: SmtpSettingsService
    telegram_settings: TelegramSettingsService
    notification_settings: NotificationSettingsService
    device: DeviceService
    department: DepartmentService
    employee: EmployeeService
    inventory: InventoryService
}

// Инфраструктурные сервисы
export interface IInfrastructureServices {
    cache: CacheService
    notifications: NotificationFactory
    network_scanner: NetworkScannerService
    prometheus: PrometheusService
    logger: ILoggerService
}

// Общий интерфейс всех сервисов
export interface IServices {
    data: IDataServices
    infrastructure: IInfrastructureServices
}