import { prisma } from "@/libs/prisma";
import { UserService } from './user.service';
import { EventService } from './event.service';
import { NotificationFactory } from './notifications/notification.factory';
import { CacheService } from './cache/cache.service';
import { SmtpSettingsService} from './smtp-settings/smtp-settings.service';
import { TelegramSettingsService} from './telegram-settings/telegram-settings.service';
import { NotificationSettingsService } from './notification-settings/notification-settings.service'
import { DeviceService } from './device/device.service';
import { NetworkScannerService } from './network-scanner/network-scanner.service';
import { PrometheusService } from './prometheus/prometheus.service'
import { Logger } from './logger/logger.service'
import { DepartmentService } from './department/department.service';
import type { IServices, IDataServices, IInfrastructureServices } from './types'
import { EmployeeService } from "./employee/employee.service";
import { InventoryService } from './inventory/inventory.service';

class ServiceFactory {
    private static instance: ServiceFactory;
    private readonly dataServices: IDataServices
    private readonly infrastructureServices: IInfrastructureServices
    

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
            inventory: new InventoryService(prisma)
        }

        const prometheusService = new PrometheusService({
            url: process.env.PROMETHEUS_PROXY_URL || 'http://localhost:8080',
            targetsPath: process.env.PROMETHEUS_TARGETS_PATH || './prometheus/targets/windows_tatgets.json',
            auth: {
                username: process.env.PROMETHEUS_USERNAME || 'admin',
                password: process.env.PROMETHEUS_AUTH_PASSWORD || ''
            }
        })


        this.infrastructureServices = {
            cache: new CacheService(),
            notifications: new NotificationFactory(),
            network_scanner: networkScanner,
            prometheus: prometheusService,
            logger: Logger.getInstance()
        }

        networkScanner.initialize({
            data: this.dataServices,
            infrastructure: this.infrastructureServices
        })

    }

    public static getInstance(): IServices {
        if (!ServiceFactory.instance) {
            ServiceFactory.instance = new ServiceFactory();
        }
        return {
            data: ServiceFactory.instance.dataServices,
            infrastructure: ServiceFactory.instance.infrastructureServices
        }
    }


}

// Экспортируем единый экземпляр фабрики сервисов
export const services = ServiceFactory.getInstance();
