import { readFileSync } from 'node:fs'
import { Agent as HttpsAgent } from 'node:https'

import { CacheService } from './cache/cache.service'
import { DepartmentService } from './department/department.service'
import { DeviceService } from './device/device.service'
import { EmployeeService } from './employee/employee.service'
import { EventService } from './event.service'
import { InventoryService } from './inventory/inventory.service'
import { Logger } from './logger/logger.service'
import { NetworkScannerService } from './network-scanner/network-scanner.service'
import { NotificationSettingsService } from './notification-settings/notification-settings.service'
import { NotificationFactory } from './notifications/notification.factory'
import { createFetchAdapter } from './prometheus/alerting/alert-rules.adapters'
import { AlertRulesConfigService } from './prometheus/alerting/alert-rules.config.service'
import { AlertRulesManagerService } from './prometheus/alerting/alert-rules.manager.service'
import { AlertRulesService } from './prometheus/alerting/alert-rules.service'
import { PrometheusService } from './prometheus/prometheus.service'
import { SmtpSettingsService } from './smtp-settings/smtp-settings.service'
import { TelegramSettingsService } from './telegram-settings/telegram-settings.service'
import type { IDataServices, IInfrastructureServices, IServices } from './types'
import { UserService } from './user.service'

import { prisma } from '@/libs/prisma'

class ServiceFactory {
        private static instance: ServiceFactory
        private readonly dataServices: IDataServices
        private readonly infrastructureServices: IInfrastructureServices
        private readonly alertRulesManager: AlertRulesManagerService

        private createPrometheusAgent(): HttpsAgent | undefined {
                const certPath = process.env.PROMETHEUS_TLS_CERT_PATH
                const keyPath = process.env.PROMETHEUS_TLS_KEY_PATH

                if (!certPath || !keyPath) {
                        return undefined
                }

                try {
                        const caPath = process.env.PROMETHEUS_TLS_CA_PATH
                        const rejectUnauthorizedEnv =
                                process.env.PROMETHEUS_TLS_REJECT_UNAUTHORIZED
                        const rejectUnauthorized =
                                rejectUnauthorizedEnv === undefined
                                        ? true
                                        : rejectUnauthorizedEnv.toLowerCase() !== 'false'

                        return new HttpsAgent({
                                cert: readFileSync(certPath),
                                key: readFileSync(keyPath),
                                ca: caPath ? readFileSync(caPath) : undefined,
                                passphrase: process.env.PROMETHEUS_TLS_KEY_PASSPHRASE,
                                rejectUnauthorized
                        })
                } catch (error) {
                        console.error(
                                '[SERVICE_FACTORY] Failed to load Prometheus TLS credentials:',
                                error
                        )
                        return undefined
                }
        }

	private constructor() {
		const deviceService = new DeviceService(prisma)
		const networkScanner = new NetworkScannerService()

		this.dataServices = {
			user: new UserService(prisma),
			event: new EventService(prisma),
			smtp_settings: new SmtpSettingsService(prisma),
			telegram_settings: new TelegramSettingsService(prisma),
			notification_settings: new NotificationSettingsService(prisma),
			device: deviceService,
			department: new DepartmentService(prisma),
			employee: new EmployeeService(prisma),
			inventory: new InventoryService(prisma),
			alert_rules: new AlertRulesService(prisma)
		}

                const prometheusAgent = this.createPrometheusAgent()

                const prometheusService = new PrometheusService({
                        url: process.env.PROMETHEUS_PROXY_URL || 'https://localhost:8443',
                        agent: prometheusAgent
                })

                const alertRulesConfigService = new AlertRulesConfigService({
                        prometheusUrl:
                                process.env.PROMETHEUS_PROXY_URL || 'https://localhost:8443',
                        rulesPath:
                                process.env.PROMETHEUS_RULES_PATH || './prometheus/alerts'
                }, undefined, createFetchAdapter({ agent: prometheusAgent }))

		this.infrastructureServices = {
			cache: new CacheService(),
			notifications: new NotificationFactory(),
			network_scanner: networkScanner,
			prometheus: prometheusService,
			logger: Logger.getInstance(),
			alert_rules_config: alertRulesConfigService
		}

		this.alertRulesManager = new AlertRulesManagerService(
			this.dataServices.alert_rules,
			this.infrastructureServices.alert_rules_config
		)

		networkScanner.initialize({
			data: this.dataServices,
			infrastructure: this.infrastructureServices,
			alertRulesManager: this.alertRulesManager
		})
	}

	public static getInstance(): IServices {
		if (!ServiceFactory.instance) {
			ServiceFactory.instance = new ServiceFactory()
		}
		return {
			data: ServiceFactory.instance.dataServices,
			infrastructure: ServiceFactory.instance.infrastructureServices,
			alertRulesManager: ServiceFactory.instance.alertRulesManager
		}
	}
}

// Экспортируем единый экземпляр фабрики сервисов
export const services = ServiceFactory.getInstance()
