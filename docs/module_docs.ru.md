# Документация модулей проекта

## Хуки

| Файл | Описание |
| --- | --- |
| `hooks/useAlertRules.ts` | Хук `useAlertRules` инкапсулирует CRUD-операции над правилами алертов Prometheus, включая импорт и экспорт YAML, и синхронизирует состояние с кешем React Query. |
| `hooks/useAuth.ts` | Хук `useAuth` связывает NextAuth с локальным стором авторизации, предоставляя методы входа, выхода, проверки текущего пользователя и синхронизации состояния аутентификации. |
| `hooks/useConfig.ts` | Хук `useConfig` предоставляет доступ к глобальной конфигурации интерфейса, позволяя читать текущую тему оформления и переключать её при помощи стора. |
| `hooks/useCurrent.ts` | Хук `useCurrent` управляет загрузкой данных текущего пользователя, синхронизируя их с состоянием аутентификации и предоставляя вспомогательные флаги загрузки и ошибок. |
| `hooks/useCurrentSession.ts` | Хук `useCurrentSession` предоставляет удобный доступ к данным текущей сессии NextAuth, возвращая пользователя, статус загрузки и признак успешной аутентификации. |
| `hooks/useData.ts` | Хук-обёртка `useData` обеспечивает безопасное получение данных через SWR, учитывая состояние аутентификации и подключая middleware авторизации. |
| `hooks/useDepartment.ts` | Хук `useDepartment` управляет загрузкой отделов и их связанных сущностей, предоставляя операции создания, обновления, удаления и обновления состава устройств с использованием React Query. |
| `hooks/useDepartmentDevices.ts` | Хук `useDepartmentDevices` формирует список устройств выбранных отделов, дополняя их информацией о доступности агента и поддерживая повторную загрузку через React Query. |
| `hooks/useDeviceAllMetrics.ts` | Хук `useDeviceAllMetrics` агрегирует метрики устройства из потоков SSE и WebSocket, объединяя системные показатели и данные о процессах в единый объект для использования в интерфейсе. |
| `hooks/useDeviceInfo.ts` | Хук `useDeviceInfo` управляет сбором сведений об устройствах по IP: получает метрики агента, создаёт записи в базе и активирует оборудование поодиночке или пакетно с учётом лицензий. |
| `hooks/useDeviceMetrics.ts` | Хук `useDeviceMetrics` устанавливает SSE-подписку для устройства, кеширует полученные метрики и управляет совместным использованием соединений между компонентами. |
| `hooks/useDeviceStatus.ts` | Хук `useDeviceStatus` периодически проверяет доступность агента для переданного устройства и синхронизирует статус с кешем React Query, инициируя обновление списка устройств при изменении состояния. |
| `hooks/useDevices.ts` | Хук `useDevices` управляет списком устройств в контексте приложения, предоставляя функции загрузки, фильтрации, статистики и обновления статусов с учётом ошибок и индикаторов загрузки. |
| `hooks/useEmployee.ts` | Хук `useEmployees` обеспечивает загрузку и управление списком сотрудников, включая создание, обновление и удаление записей с обновлением кеша React Query и учётом фильтров. |
| `hooks/useEmployeeDevices.ts` | Хук `useEmployeeDevices` загружает список устройств, закреплённых за сотрудником, и дополняет их текущим статусом, используя React Query для кеширования и повторного запроса данных. |
| `hooks/useEvents.ts` | Хук `useEvents` предоставляет единый интерфейс для работы с событиями пользователей: загрузка, отметка как прочитанные, подсчёт непрочитанного и управление состояниями загрузки/ошибок. |
| `hooks/useHardwareChangeEvents.ts` | Хук `useHardwareChangeEvents` отслеживает неподтверждённые события изменения оборудования для конкретного устройства, поддерживая автоматическое обновление и ручное перезапрос данных. |
| `hooks/useInventory.ts` | Хук `useInventory` координирует процессы инвентаризации: получение списков, создание актов, управление позициями и экспорт данных в Excel с помощью React Query и серверных действий. |
| `hooks/useInventoryCollection.ts` | Хук `useInventoryCollection` координирует сбор подробных сведений об оборудовании для актов инвентаризации, фиксируя состояние каждой попытки и предоставляя результаты для интерфейса. |
| `hooks/useMediaQuery.ts` | Хук `useMediaQuery` отслеживает соответствие медиа-запросу и возвращает логический признак, автоматически подписываясь на изменения viewport. |
| `hooks/useNetworkScanner.ts` | Хук `useNetworkScanner` инкапсулирует сценарии сканирования сети, предоставляя функции запуска, остановки и поиска агентов, а также управляя состояниями загрузки и ошибок процесса. |
| `hooks/useNotificationSettings.ts` | Хук `useNotificationSettings` обрабатывает загрузку и обновление настроек уведомлений пользователя, создавая значения по умолчанию и синхронизируя их с сервером через actions. |
| `hooks/useProcessMetrics.ts` | Хук `useProcessMetrics` устанавливает WebSocket-подключение для получения данных о процессах устройства, управляя переподключением, кешированием URL и состояниями соединения. |
| `hooks/useSessionManager.ts` | Хук `useSessionManager` управляет сессиями пользователя: загружает активные подключения, определяет текущую сессию и позволяет завершать отдельные сеансы с учётом ошибок и состояния загрузки. |
| `hooks/useSidebar.ts` | Хук `useSidebar` предоставляет доступ к стору боковой панели, позволяя управлять состоянием сворачивания меню из компонентов. |
| `hooks/useSmtpSettings.ts` | Хук `useSmtpSettings` отвечает за конфигурацию SMTP: загрузку, обновление и верификацию параметров почтового сервера, а также переключение провайдеров. |
| `hooks/useTelegram.ts` | Хук `useTelegram` управляет настройкой Telegram-бота: загрузкой параметров, проверкой доступности, запуском бота и отправкой тестовых сообщений с учётом состояний загрузки. |
| `hooks/useUser.ts` | Хук `useUser` объединяет серверные действия по управлению профилем: изменение имени, почты, пароля и аватара с синхронизацией Zustand и сессии NextAuth. |
| `hooks/useUserAvatar.ts` | Хук `useUserAvatar` управляет загрузкой, обновлением и удалением аватаров пользователя, синхронизируя изменения с локальным стором и актуальной сессией NextAuth. |
| `hooks/useWarranty.ts` | Хук `useWarranty` обрабатывает гарантийные параметры устройств: точечное и массовое обновление дат, вычисление остатка гарантии и синхронизацию стора устройств после серверных вызовов. |

## Сервисы

| Файл | Описание |
| --- | --- |
| `services/alerts/alert-processor.service.ts` | Обрабатывает события Prometheus и формирует уведомления. |
| `services/base.interfaces.ts` | Определяет общие интерфейсы для базовых сервисов и их зависимостей. |
| `services/base.service.ts` | Базовый класс для сервисов с повторно используемыми методами и зависимостями. |
| `services/cache/cache.service.ts` | Сервис для хранения и извлечения данных из локального кеша. |
| `services/department/department.interface.ts` | Интерфейсы данных для сущности отдела. |
| `services/department/department.service.ts` | Сервис управления отделами, включая распределение устройств и сотрудников. |
| `services/device/device.interfaces.ts` | Контракты и DTO для сервисов устройств. |
| `services/device/device.service.ts` | Сервис управления устройствами: создание, обновление, фильтрация и привязка. |
| `services/employee/employee.interfaces.ts` | Интерфейсы для параметров и результатов операций с сотрудниками. |
| `services/employee/employee.service.ts` | Сервис CRUD-операций над сотрудниками и их связями. |
| `services/event.interfaces.ts` | Интерфейсы событий системы. |
| `services/event.service.ts` | Сервис фиксации и поиска событий системы. |
| `services/index.ts` | Экспортирует и связывает все сервисы домена для удобного импорта. |
| `services/inventory/inventory.interface.ts` | Определяет структуры данных инвентаризации. |
| `services/inventory/inventory.service.ts` | Оркеструет инвентаризационные процессы и работу с позициями. |
| `services/logger/logger.interface.ts` | Контракты для реализации логгера. |
| `services/logger/logger.service.ts` | Сервис логирования с унифицированным интерфейсом. |
| `services/metrics/metrics.service.ts` | Сервис агрегирования и выдачи метрик по устройствам. |
| `services/network-scanner/network-scanner.interfaces.ts` | Определяет контракты для результатов и опций сетевого сканера. |
| `services/network-scanner/network-scanner.service.ts` | Организует сканирование сети и поиск доступных агентов. |
| `services/notification-settings/notification-settings.interfaces.ts` | Типы для настройки уведомлений пользователя. |
| `services/notification-settings/notification-settings.service.ts` | Сервис пользовательских настроек уведомлений. |
| `services/notifications/alermanager.types.ts` | Типы данных для взаимодействия с Alertmanager. |
| `services/notifications/alertmanager.types.ts` | Типы запросов и ответов Alertmanager. |
| `services/notifications/base.notification.service.ts` | Базовый класс для сервисов уведомлений с общими утилитами. |
| `services/notifications/email.service.ts` | Сервис отправки email-уведомлений через настроенный SMTP. |
| `services/notifications/notification.factory.ts` | Фабрика, создающая конкретные службы отправки уведомлений. |
| `services/notifications/telegram.service.ts` | Сервис доставки уведомлений через Telegram-бота. |
| `services/notifications/templates/alert.template.ts` | Шаблон письма с уведомлением об аварийном событии. |
| `services/notifications/templates/changeEmail.ts` | Шаблон письма с подтверждением изменения почты. |
| `services/notifications/templates/verifyEmail.ts` | Шаблон письма для подтверждения адреса электронной почты. |
| `services/notifications/types.ts` | Общие типы для системы уведомлений. |
| `services/prometheus/alerting/alert-rules.adapters.ts` | Адаптеры для преобразования структур правил между БД и YAML форматом. |
| `services/prometheus/alerting/alert-rules.config.service.interface.ts` | Интерфейсы для сервиса конфигурации правил оповещений. |
| `services/prometheus/alerting/alert-rules.config.service.ts` | Сервис управления YAML-конфигурацией правил Prometheus Alertmanager. |
| `services/prometheus/alerting/alert-rules.config.types.ts` | Типы данных конфигурации правил оповещений. |
| `services/prometheus/alerting/alert-rules.interfaces.ts` | Контракты и интерфейсы, описывающие правила оповещений. |
| `services/prometheus/alerting/alert-rules.manager.service.ts` | Высокоуровневый менеджер, координирующий загрузку, синхронизацию и проверку правил оповещений. |
| `services/prometheus/alerting/alert-rules.service.ts` | Сервис CRUD-операций над правилами оповещений в базе данных. |
| `services/prometheus/alerting/alert-rules.types.ts` | Содержит типы и перечисления для интеграцией с Prometheus. |
| `services/prometheus/metrics/constants.ts` | Константы, используемые при работе с метриками Prometheus. |
| `services/prometheus/metrics/index.ts` | Точка входа для агрегаторов метрик Prometheus. |
| `services/prometheus/metrics/types.ts` | Типы данных для метрик Prometheus. |
| `services/prometheus/prometheus.interfaces.ts` | Определяет интерфейсы и контракты, связанные с интеграцией с Prometheus. |
| `services/prometheus/prometheus.parser.ts` | Утилиты для преобразования ответов Prometheus в структуры приложения. |
| `services/prometheus/prometheus.service.ts` | Сервис интеграции с Prometheus для выполнения запросов к API и обработки данных. |
| `services/redis/client.ts` | Инициализация и конфигурация клиента Redis. |
| `services/redis/constants.ts` | Константы, связанные с подключением к Redis. |
| `services/redis/redis.service.ts` | Обёртка над клиентом Redis для бизнес-операций. |
| `services/redis/types.ts` | Типы и контракты для работы с Redis. |
| `services/smtp-settings/smtp-settiings.constants.ts` | Служебные константы для сервиса. |
| `services/smtp-settings/smtp-settings.service.ts` | Сервис управления SMTP-конфигурацией и проверкой соединения. |
| `services/storage/storage.service.ts` | Сервис доступа к хранилищу файлов и загрузок. |
| `services/telegram-settings/telegram-settings.interfaces.ts` | Типы данных для настроек Telegram. |
| `services/telegram-settings/telegram-settings.service.ts` | Сервис управления привязкой Telegram. |
| `services/types.ts` | Общие типы и алиасы сервисного слоя. |
| `services/user.interfaces.ts` | Типы и интерфейсы, описывающие пользователя. |
| `services/user.service.ts` | Сервис работы с данными пользователя и профилем. |

## Компоненты

| Файл | Описание |
| --- | --- |
| `components/database/DatabaseError.tsx` | Компонент `DatabaseError` отображает интерфейсный блок в разделе `database` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/database/DatabaseProvider.tsx` | Компонент `DatabaseProvider` отображает интерфейсный блок в разделе `database` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/alert-rules/MonitoringTabs.tsx` | Компонент `MonitoringTabs` отображает набор вкладок в разделе `features/alert-rules` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/alert-rules/add/AddAlertRule.tsx` | Компонент `AddAlertRule` отображает оповещение в разделе `features/alert-rules/add` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/alert-rules/add/forms/AddModal.tsx` | Компонент `AddModal` отображает модальное окно в разделе `features/alert-rules/add/forms` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/alert-rules/detail/AlertRuleDetail.tsx` | Компонент `AlertRuleDetail` отображает оповещение в разделе `features/alert-rules/detail` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/alert-rules/detail/EventDetail.tsx` | Компонент `EventDetail` отображает интерфейсный блок в разделе `features/alert-rules/detail` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/alert-rules/table/AlertRulesColumns.tsx` | Компонент `AlertRulesColumns` отображает оповещение в разделе `features/alert-rules/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/alert-rules/table/AlertRulesTable.tsx` | Компонент `AlertRulesTable` отображает таблицу данных в разделе `features/alert-rules/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/alert-rules/table/EventsColumns.tsx` | Компонент `EventsColumns` отображает интерфейсный блок в разделе `features/alert-rules/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/alert-rules/table/EventsTable.tsx` | Компонент `EventsTable` отображает таблицу данных в разделе `features/alert-rules/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/auth/AuthWrapper.tsx` | Компонент `AuthWrapper` отображает интерфейсный блок в разделе `features/auth` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/auth/forms/CreateAccountForm.tsx` | Компонент `CreateAccountForm` отображает форму ввода в разделе `features/auth/forms` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/auth/forms/LoginForm.tsx` | Компонент `LoginForm` отображает форму ввода в разделе `features/auth/forms` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/auth/forms/NewPasswordForm.tsx` | Компонент `NewPasswordForm` отображает форму ввода в разделе `features/auth/forms` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/auth/forms/ResetPasswordForm.tsx` | Компонент `ResetPasswordForm` отображает форму ввода в разделе `features/auth/forms` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/auth/forms/VerifyAccountForm.tsx` | Компонент `VerifyAccountForm` отображает форму ввода в разделе `features/auth/forms` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/departments/add/AddDepartment.tsx` | Компонент `AddDepartment` отображает интерфейсный блок в разделе `features/departments/add` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/departments/add/forms/AddModal.tsx` | Компонент `AddModal` отображает модальное окно в разделе `features/departments/add/forms` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/departments/detail/DepartmentsDetail.tsx` | Компонент `DepartmentsDetail` отображает интерфейсный блок в разделе `features/departments/detail` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/departments/device/ManageDepartmentDevicesModal.tsx` | Компонент `ManageDepartmentDevicesModal` отображает модальное окно в разделе `features/departments/device` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/departments/edit/forms/EditModal.tsx` | Компонент `EditModal` отображает модальное окно в разделе `features/departments/edit/forms` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/departments/table/DepartmentsColumns.tsx` | Компонент `DepartmentsColumns` отображает интерфейсный блок в разделе `features/departments/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/departments/table/DepartmentsTable.tsx` | Компонент `DepartmentsTable` отображает таблицу данных в разделе `features/departments/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/DeviceDetail.tsx` | Компонент `DeviceDetail` отображает интерфейсный блок в разделе `features/devices/detail` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/hardware/HardwareSection.tsx` | Компонент `HardwareSection` отображает интерфейсный блок в разделе `features/devices/detail/hardware` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/perfomance/PerformanceSection.tsx` | Компонент `PerformanceSection` отображает форму ввода в разделе `features/devices/detail/perfomance` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/perfomance/metrics/CpuMetrics.tsx` | Компонент `CpuMetrics` отображает интерфейсный блок в разделе `features/devices/detail/perfomance/metrics` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/perfomance/metrics/DiskMetrics.tsx` | Компонент `DiskMetrics` отображает интерфейсный блок в разделе `features/devices/detail/perfomance/metrics` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/perfomance/metrics/MemoryMetrics.tsx` | Компонент `MemoryMetrics` отображает интерфейсный блок в разделе `features/devices/detail/perfomance/metrics` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/perfomance/metrics/NetworkMetrics.tsx` | Компонент `NetworkMetrics` отображает интерфейсный блок в разделе `features/devices/detail/perfomance/metrics` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/process/ProcessError.tsx` | Компонент `ProcessError` отображает интерфейсный блок в разделе `features/devices/detail/process` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/process/ProcessHeader.tsx` | Компонент `ProcessHeader` отображает заголовок интерфейса в разделе `features/devices/detail/process` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/process/ProcessList.tsx` | Компонент `ProcessList` отображает список элементов в разделе `features/devices/detail/process` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/process/ProcessSkeleton.tsx` | Компонент `ProcessSkeleton` отображает интерфейсный блок в разделе `features/devices/detail/process` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/process/ProcessTable.tsx` | Компонент `ProcessTable` отображает таблицу данных в разделе `features/devices/detail/process` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/system/SystemSection.tsx` | Компонент `SystemSection` отображает интерфейсный блок в разделе `features/devices/detail/system` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/warranty/BulkWarrantyUpdate.tsx` | Компонент `BulkWarrantyUpdate` отображает интерфейсный блок в разделе `features/devices/detail/warranty` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/detail/warranty/WarrantyEditor.tsx` | Компонент `WarrantyEditor` отображает интерфейсный блок в разделе `features/devices/detail/warranty` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/hardware-change/HardwareChangeConfirmModal.tsx` | Компонент `HardwareChangeConfirmModal` отображает модальное окно в разделе `features/devices/hardware-change` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/scan/DeviceScan.tsx` | Компонент `DeviceScan` отображает интерфейсный блок в разделе `features/devices/scan` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/scan/forms/ScanModal.tsx` | Компонент `ScanModal` отображает модальное окно в разделе `features/devices/scan/forms` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/table/DeviceActions.tsx` | Компонент `DeviceActions` отображает интерфейсный блок в разделе `features/devices/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/table/DeviceColumns.tsx` | Компонент `DeviceColumns` отображает интерфейсный блок в разделе `features/devices/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/table/DeviceTable.tsx` | Компонент `DeviceTable` отображает таблицу данных в разделе `features/devices/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/table/ScanDeviceColumns.tsx` | Компонент `ScanDeviceColumns` отображает интерфейсный блок в разделе `features/devices/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/devices/table/ScanTable.tsx` | Компонент `ScanTable` отображает таблицу данных в разделе `features/devices/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/employee/add/AddEmployee.tsx` | Компонент `AddEmployee` отображает интерфейсный блок в разделе `features/employee/add` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/employee/add/forms/AddModal.tsx` | Компонент `AddModal` отображает модальное окно в разделе `features/employee/add/forms` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/employee/detail/EmployeeDetail.tsx` | Компонент `EmployeeDetail` отображает интерфейсный блок в разделе `features/employee/detail` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/employee/device/forms/ManageDevicesModal.tsx` | Компонент `ManageDevicesModal` отображает модальное окно в разделе `features/employee/device/forms` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/employee/edit/forms/EditModal.tsx` | Компонент `EditModal` отображает модальное окно в разделе `features/employee/edit/forms` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/employee/table/EmployeeColumns.tsx` | Компонент `EmployeeColumns` отображает интерфейсный блок в разделе `features/employee/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/employee/table/EmployeeTable.tsx` | Компонент `EmployeeTable` отображает таблицу данных в разделе `features/employee/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/events/table/EventsTable.tsx` | Компонент `EventsTable` отображает таблицу данных в разделе `features/events/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/inventory/add/AddInventory.tsx` | Компонент `AddInventory` отображает интерфейсный блок в разделе `features/inventory/add` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/inventory/add/forms/AddModal.tsx` | Компонент `AddModal` отображает модальное окно в разделе `features/inventory/add/forms` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/inventory/add/forms/steps/DepartmentSelectionStep.tsx` | Компонент `DepartmentSelectionStep` отображает шаг процесса в разделе `features/inventory/add/forms/steps` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/inventory/add/forms/steps/DeviceSelectionStep.tsx` | Компонент `DeviceSelectionStep` отображает шаг процесса в разделе `features/inventory/add/forms/steps` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/inventory/add/forms/steps/FinalStep.tsx` | Компонент `FinalStep` отображает шаг процесса в разделе `features/inventory/add/forms/steps` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/inventory/add/forms/steps/HardwareInfoStep.tsx` | Компонент `HardwareInfoStep` отображает шаг процесса в разделе `features/inventory/add/forms/steps` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/inventory/detail/InventoryDetail.tsx` | Компонент `InventoryDetail` отображает интерфейсный блок в разделе `features/inventory/detail` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/inventory/table/InventoryColumns.tsx` | Компонент `InventoryColumns` отображает интерфейсный блок в разделе `features/inventory/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/inventory/table/InventoryTable.tsx` | Компонент `InventoryTable` отображает таблицу данных в разделе `features/inventory/table` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/UserSettings.tsx` | Компонент `UserSettings` отображает интерфейсный блок в разделе `features/user` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/account/ChangeEmailForm.tsx` | Компонент `ChangeEmailForm` отображает форму ввода в разделе `features/user/account` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/account/ChangePasswordForm.tsx` | Компонент `ChangePasswordForm` отображает форму ввода в разделе `features/user/account` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/appearance/ChangeColorForm.tsx` | Компонент `ChangeColorForm` отображает форму ввода в разделе `features/user/appearance` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/appearance/ChangeLanguageForm.tsx` | Компонент `ChangeLanguageForm` отображает форму ввода в разделе `features/user/appearance` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/appearance/ChangeTheme.tsx` | Компонент `ChangeTheme` отображает интерфейсный блок в разделе `features/user/appearance` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/notifications/ChangeNotificationsForm.tsx` | Компонент `ChangeNotificationsForm` отображает форму ввода в разделе `features/user/notifications` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/notifications/ChangeSmtpSettingsForm.tsx` | Компонент `ChangeSmtpSettingsForm` отображает форму ввода в разделе `features/user/notifications` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/notifications/ChangeTelegramSettingsForm.tsx` | Компонент `ChangeTelegramSettingsForm` отображает форму ввода в разделе `features/user/notifications` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/profile/ChangeAvatarForm.tsx` | Компонент `ChangeAvatarForm` отображает форму ввода в разделе `features/user/profile` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/profile/ChangeInfoForm.tsx` | Компонент `ChangeInfoForm` отображает форму ввода в разделе `features/user/profile` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/sessions/SessionItem.tsx` | Компонент `SessionItem` отображает элемент списка в разделе `features/user/sessions` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/sessions/SessionModal.tsx` | Компонент `SessionModal` отображает модальное окно в разделе `features/user/sessions` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/features/user/sessions/SessionsList.tsx` | Компонент `SessionsList` отображает список элементов в разделе `features/user/sessions` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/images/LogoImage.tsx` | Компонент `LogoImage` отображает интерфейсный блок в разделе `images` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/layout/LayoutContainer.tsx` | Компонент `LayoutContainer` отображает интерфейсный блок в разделе `layout` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/layout/header/Header.tsx` | Компонент `Header` отображает заголовок интерфейса в разделе `layout/header` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/layout/header/HeaderMenu.tsx` | Компонент `HeaderMenu` отображает меню навигации в разделе `layout/header` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/layout/header/Logo.tsx` | Компонент `Logo` отображает интерфейсный блок в разделе `layout/header` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/layout/header/ProfileMenu.tsx` | Компонент `ProfileMenu` отображает меню навигации в разделе `layout/header` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/layout/header/Search.tsx` | Компонент `Search` отображает интерфейсный блок в разделе `layout/header` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/layout/header/notifications/Events.tsx` | Компонент `Events` отображает интерфейсный блок в разделе `layout/header/notifications` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/layout/header/notifications/EventsList.tsx` | Компонент `EventsList` отображает список элементов в разделе `layout/header/notifications` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/layout/sidebar/DashboardNav.tsx` | Компонент `DashboardNav` отображает интерфейсный блок в разделе `layout/sidebar` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/layout/sidebar/Sidebar.tsx` | Компонент `Sidebar` отображает интерфейсный блок в разделе `layout/sidebar` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/layout/sidebar/SidebarHeader.tsx` | Компонент `SidebarHeader` отображает заголовок интерфейса в разделе `layout/sidebar` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/layout/sidebar/SidebarItem.tsx` | Компонент `SidebarItem` отображает элемент списка в разделе `layout/sidebar` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/layout/sidebar/UserNav.tsx` | Компонент `UserNav` отображает интерфейсный блок в разделе `layout/sidebar` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/alert.tsx` | Компонент `alert` отображает оповещение в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/alertDialog.tsx` | Компонент `alertDialog` отображает оповещение в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/avatar.tsx` | Компонент `avatar` отображает отображение аватара в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/badge.tsx` | Компонент `badge` отображает значок статуса в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/breadcrumb.tsx` | Компонент `breadcrumb` отображает интерфейсный блок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/button.tsx` | Компонент `button` отображает кнопку действия в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/calendar.tsx` | Компонент `calendar` отображает интерфейсный блок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/card.tsx` | Компонент `card` отображает информационную карточку в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/chart.tsx` | Компонент `chart` отображает график или диаграмму в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/checkbox.tsx` | Компонент `checkbox` отображает интерфейсный блок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/dialog.tsx` | Компонент `dialog` отображает интерфейсный блок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/dropdowmmenu.tsx` | Компонент `dropdowmmenu` отображает меню навигации в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/CardContainer.tsx` | Компонент `CardContainer` отображает информационную карточку в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/ColorSwitcher.tsx` | Компонент `ColorSwitcher` отображает интерфейсный блок в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/ConfirmModal.tsx` | Компонент `ConfirmModal` отображает модальное окно в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/CopyButton.tsx` | Компонент `CopyButton` отображает кнопку действия в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/DataTable.tsx` | Компонент `DataTable` отображает таблицу данных в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/DatePicker.tsx` | Компонент `DatePicker` отображает интерфейсный блок в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/FormWrapper.tsx` | Компонент `FormWrapper` отображает форму ввода в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/Heading.tsx` | Компонент `Heading` отображает интерфейсный блок в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/Hint.tsx` | Компонент `Hint` отображает интерфейсный блок в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/ModalForm.tsx` | Компонент `ModalForm` отображает модальное окно в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/Select-filter.tsx` | Компонент `Select-filter` отображает интерфейсный блок в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/SmtpSettingsFormSkeleton.tsx` | Компонент `SmtpSettingsFormSkeleton` отображает форму ввода в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/ToggleCard.tsx` | Компонент `ToggleCard` отображает информационную карточку в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/elements/UserAvatar.tsx` | Компонент `UserAvatar` отображает отображение аватара в разделе `ui/elements` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/form.tsx` | Компонент `form` отображает форму ввода в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/input.tsx` | Компонент `input` отображает поле ввода в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/label.tsx` | Компонент `label` отображает интерфейсный блок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/popover.tsx` | Компонент `popover` отображает интерфейсный блок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/progress.tsx` | Компонент `progress` отображает интерфейсный блок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/scrollarea.tsx` | Компонент `scrollarea` отображает интерфейсный блок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/select.tsx` | Компонент `select` отображает интерфейсный блок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/separator.tsx` | Компонент `separator` отображает интерфейсный блок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/skeleton.tsx` | Компонент `skeleton` отображает интерфейсный блок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/switch.tsx` | Компонент `switch` отображает интерфейсный блок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/table.tsx` | Компонент `table` отображает таблицу данных в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/tabs.tsx` | Компонент `tabs` отображает набор вкладок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/textarea.tsx` | Компонент `textarea` отображает интерфейсный блок в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |
| `components/ui/tooltip.tsx` | Компонент `tooltip` отображает подсказку в разделе `ui` и интегрируется с соответствующими хуками и сервисами для получения данных. |