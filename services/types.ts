// services/types.ts
import { CacheService } from './cache/cache.service'
import { DepartmentService } from './department/department.service'
import { DeviceService } from './device/device.service'
import { EmployeeService } from './employee/employee.service'
import { EventService } from './event.service'
import { InventoryService } from './inventory/inventory.service'
import { ILoggerService } from './logger/logger.interface'
import { NetworkScanJobService } from './network-scan-job/network-scan-job.service'
import { NetworkScannerService } from './network-scanner/network-scanner.service'
import { NotificationSettingsService } from './notification-settings/notification-settings.service'
import { NotificationFactory } from './notifications/notification.factory'
import { AlertRulesConfigService } from './prometheus/alerting/alert-rules.config.service'
import { AlertRulesManagerService } from './prometheus/alerting/alert-rules.manager.service'
import { AlertRulesService } from './prometheus/alerting/alert-rules.service'
import { PrometheusService } from './prometheus/prometheus.service'
import { SmtpSettingsService } from './smtp-settings/smtp-settings.service'
import { TelegramSettingsService } from './telegram-settings/telegram-settings.service'
import { UserService } from './user.service'

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
	alert_rules: AlertRulesService
	network_scan_job: NetworkScanJobService
}

// Инфраструктурные сервисы
export interface IInfrastructureServices {
	cache: CacheService
	notifications: NotificationFactory
	network_scanner: NetworkScannerService
	prometheus: PrometheusService
	logger: ILoggerService
	alert_rules_config: AlertRulesConfigService
}

// Общий интерфейс всех сервисов
export interface IServices {
	data: IDataServices
	infrastructure: IInfrastructureServices
	alertRulesManager: AlertRulesManagerService
}
