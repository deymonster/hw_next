import { Card, CardContent } from '@/components/ui/card';
import { Cpu, HardDrive, MonitorSmartphone } from "lucide-react";
import { DeviceMetrics } from '@/services/prometheus/prometheus.interfaces';

interface HardwareSectionProps {
    hardwareInfo: DeviceMetrics['hardwareInfo'] | null | undefined;
}

export function HardwareSection({ hardwareInfo }: HardwareSectionProps) {
    if (!hardwareInfo) return null;

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {/* Процессор и Память */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-6">
                        {/* CPU */}
                        <div className="flex items-start space-x-3">
                            <Cpu className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <h4 className="font-medium">Processor</h4>
                                <p className="text-sm text-muted-foreground">
                                    {hardwareInfo.cpu.model}
                                </p>
                            </div>
                        </div>

                        {/* Memory */}
                        <div className="flex items-start space-x-3">
                            <Cpu className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <h4 className="font-medium">Memory</h4>
                                <div className="space-y-2">
                                    {hardwareInfo.memory.modules.map((module, index) => (
                                        <div key={index} className="text-sm text-muted-foreground">
                                            {module.capacity} {module.speed} {module.manufacturer}
                                            <div className="text-xs opacity-75">
                                                S/N: {module.serial_number} • P/N: {module.part_number}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Хранилище и GPU */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-6">
                        {/* Storage */}
                        <div className="flex items-start space-x-3">
                            <HardDrive className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <h4 className="font-medium">Storage</h4>
                                <div className="space-y-2">
                                    {hardwareInfo.disks.map((disk, index) => (
                                        <div key={index} className="text-sm text-muted-foreground">
                                            {disk.model}
                                            <div className="text-xs opacity-75">
                                                {disk.size} • {disk.type} • Health: {disk.health}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* GPU */}
                        <div className="flex items-start space-x-3">
                            <MonitorSmartphone className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <h4 className="font-medium">Graphics</h4>
                                <div className="space-y-2">
                                    {hardwareInfo.gpus.map((gpu, index) => (
                                        <div key={index} className="text-sm text-muted-foreground">
                                            {gpu.name}
                                            <div className="text-xs opacity-75">
                                                Memory: {gpu.memory.total} MB
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}