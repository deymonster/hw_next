import { DeviceMetrics } from '@/services/prometheus/prometheus.interfaces';
import { Progress } from "@/components/ui/progress";


interface DiskMetricsProps {
    metrics: DeviceMetrics['diskMetrics'];
}

export function DiskMetrics({ metrics }: DiskMetricsProps) {
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
        return <div>No disk data available</div>;
    }
    
    const formatDiskSpace = (value: number): string => {
        if (value >= 1024) {
            return `${(value / 1024).toFixed(2)} TB`;
        }
        return `${value.toFixed(2)} GB`;
    };

    return (
        <div className="space-y-6">
            {metrics.map((disk, index) => (
                <div key={disk.disk} className="space-y-4">
                    {index > 0 && <hr className="my-4" />}
                    
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold">Disk {disk.disk}</h4>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Used Space</p>
                            <p className="text-sm text-muted-foreground">
                                {disk.usage.percent.toFixed(1)}%
                            </p>
                        </div>
                        <Progress value={disk.usage.percent} className="h-2" />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">
                                Total
                            </p>
                            <p className="text-lg font-medium">
                                {formatDiskSpace(disk.usage.total)}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">
                                Used
                            </p>
                            <p className="text-lg font-medium">
                                {formatDiskSpace(disk.usage.used)}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">
                                Free
                            </p>
                            <p className="text-lg font-medium">
                                {formatDiskSpace(disk.usage.free)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">
                                Read Speed
                            </p>
                            <p className="text-lg font-medium">
                                {disk.performance.read.value} {disk.performance.read.unit}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">
                                Write Speed
                            </p>
                            <p className="text-lg font-medium">
                                {disk.performance.write.value} {disk.performance.write.unit}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}