# NITRINOnet Monitoring System Guide

NITRINOnet Monitoring System is designed for comprehensive monitoring, inventory, and management of enterprise IT infrastructure. It provides centralized access to equipment status data, allowing prompt reaction to any changes or anomalies.

## 1. Equipment Monitoring

The system ensures real-time collection and visualization of metrics from workstations and servers.

### Main Monitoring Indicators

- **Central Processing Unit (CPU)**: Tracking overall load, load per core, CPU temperature (if hardware sensors are available).
- **Random Access Memory (RAM)**: Control of total volume, used, and free memory.
- **Disk Subsystem**: Monitoring of logical disk usage, total volume, and free space, read/write metrics.
- **Network Activity**: Displaying list of network interfaces, IP and MAC addresses, connection speed, incoming and outgoing traffic.
- **Availability Status (Online/Offline)**: Automatic determination of agent availability. If a device stops sending metrics or responding to requests, it is assigned "Offline" status with the last contact time recorded.

### Process Monitoring

- Displaying a full list of running processes on a remote device.
- Analysis of resource consumption (CPU/RAM) by specific applications to identify "heavy" tasks.

## 2. Notification System

A flexible rule system allows automatically receiving notifications about failures and deviations in equipment operation.

### Notification Rules Management

Users can create monitoring rules via a visual constructor without manual editing of configuration files.

- **Rule Categories**:
    - **Resource Control**: Exceeding CPU, RAM load thresholds, or disk usage.
    - **Agent Status**: Notification when connection with a device is lost (transition to Offline status).
    - **Configuration Change**: Detection of changes in hardware.
    - **Network Monitoring**: Control of network activity.
- **Trigger Conditions**: Setting threshold values (greater/less/equal), comparison operators, and event duration (e.g., "CPU > 90% for 5 minutes").
- **Notification Priorities**:
    - 🔵 **INFO**: General notifications not requiring urgent measures.
    - 🟡 **WARNING**: Potential problems requiring administrator attention.
    - 🔴 **CRITICAL**: Serious failures requiring immediate reaction.

### Notification Channels

- **System Interface**: Pop-up notifications and saving event history in the notification log.
- **Telegram**: Instant sending of notifications to private messages or group chats via a configured bot.
- **Email**: Sending emails with incident details via SMTP server.

## 3. Equipment Inventory

The inventory module allows keeping a full record of the organization's computer park, tracking configuration and equipment movement.

### Hardware Passport

Automatic collection and storage of detailed hardware information without physical access to the device:

- **Motherboard**: Manufacturer, model, BIOS version.
- **Processor**: Model, clock frequency, number of cores/threads.
- **Memory**: Type, volume, manufacturer, slot distribution.
- **Storage**: HDD/SSD models, serial numbers, volume.
- **Video Adapters and Network Cards**: Detailed characteristics of installed adapters.

### Equipment Accounting

- **Assignment to Employees**: Ability to assign a device to a specific financially responsible person.
- **Department Binding**: Grouping devices by organizational structure for convenient navigation and filtering.
- **Warranty Accounting**: Fixing purchase date and warranty term, automatic tracking of warranty period expiration.

### Inventory Process

- Creation of inventory sessions.
- Formation of equipment lists.
- Export of inventory results.

## 4. Network Discovery

Tool for automatic search and addition of devices, simplifying system deployment in large networks.

- **Network Scanning**: Search for active devices in specified subnets.
- **Agent Discovery**: Specialized search for installed monitoring agents on default ports.
- **Device Import**: Convenient interface for mass addition of found devices to the monitoring database.

## 5. User Management and Security

- **Authentication**: Secure login to the system, support for password recovery via Email using tokens.
- **Profile Management**: Setting personal data, changing avatar, choosing theme (Dark/Light/System).
- **Multilingual Interface**: Support for multiple languages (English, Russian) for user convenience.
- **Sessions**: Viewing and managing active user sessions.

## 6. Settings and Integrations

- **Telegram Bot**: Setting bot token and chat ID for integration with the messenger. Connection testing support.
- **SMTP Server**: Flexible configuration of the mail gateway (support for presets for Gmail, Yandex, Mail.ru, and custom SMTP servers) for sending system emails.
- **Notification Management**: Personal setting of received notification types (Site, Telegram, Email) for each user.

## 7. Organizational Structure Management

The system allows modeling the company's organizational structure for effective equipment fleet management.

### Departments

- **Creating Departments**: Grouping employees and equipment by divisions.
- **Assigning Managers**: Ability to specify a department head.
- **Statistics**: Viewing the number of employees and devices in each department.

### Employees

- **Employee Database**: Maintaining a list of employees with contact details.
- **Equipment Assignment**: Direct linking of inventory items to employees.
- **Movement History**: Tracking who held the device at different times.

## 8. Licensing and Updates

The "License" section provides information about the current system version and license status.

- **Version Information**: Displaying current build version and update date.
- **Docker Hub Status**: Information about the relevance of the used container image.
