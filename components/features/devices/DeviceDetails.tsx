import { useDeviceMetrics } from '../../../hooks/useDeviceMetrics'

interface DeviceDetailsProps {
    deviceId: string
}

export function DeviceDetails({ deviceId }: DeviceDetailsProps) {
    const { metrics, error } = useDeviceMetrics(deviceId)

    if (error) {
        return <div>Error loading metrics: {error.message}</div>
    }

    if (!metrics) {
        return <div>Loading metrics...</div>
    }

    const { systemInfo, hardwareInfo } = metrics

    return (
        <div>
            <h2>System Information</h2>
            {/* Отображение системной информации */}
            <div>
                <h3>CPU Usage</h3>
                <p>User: {systemInfo.cpu.user}%</p>
                <p>System: {systemInfo.cpu.system}%</p>
                <p>Idle: {systemInfo.cpu.idle}%</p>
            </div>

            <div>
                <h3>Memory</h3>
                <p>Total: {hardwareInfo.memory.total} GB</p>
                <p>Used: {hardwareInfo.memory.used} GB</p>
                <p>Free: {hardwareInfo.memory.free} GB</p>
            </div>

            {/* Добавьте другие метрики по необходимости */}
        </div>
    )
} 