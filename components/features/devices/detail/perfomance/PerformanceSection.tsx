import { Card, CardContent } from '@/components/ui/card';
import { CpuMetrics } from './metrics/CpuMetrics';
import { NetworkMetrics } from './metrics/NetworkMetrics';
import { MemoryMetrics } from './metrics/MemoryMetrics';
import { DiskMetrics } from './metrics/DiskMetrics';

interface PerformanceSectionProps {
    processorMetrics: any; // TODO: Add proper type
    memoryMetrics: any;
    diskMetrics: any;
    networkMetrics: any;
}

export function PerformanceSection({ 
    processorMetrics,
    memoryMetrics,
    diskMetrics,
    networkMetrics
}: PerformanceSectionProps) {

    
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card className="h-[300px]">
                <CardContent className="pt-6 h-full">
                    <h3 className="text-lg font-semibold mb-4">CPU Usage</h3>
                    <CpuMetrics metrics={processorMetrics} />
                </CardContent>
            </Card>

            <Card className="h-[300px]">
                <CardContent className="pt-6 h-full">
                    <h3 className="text-lg font-semibold mb-4">Memory Usage</h3>
                    <MemoryMetrics metrics={memoryMetrics} />
                </CardContent>
            </Card>

            <Card className="h-[300px]">
                <CardContent className="pt-6 h-full overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-4">Disk Usage</h3>
                    <DiskMetrics metrics={diskMetrics} />
                </CardContent>
            </Card>
            
            <Card className="h-[300px]">
                <CardContent className="pt-6 h-full">
                    <h3 className="text-lg font-semibold mb-4">Network Usage</h3>
                    <NetworkMetrics metrics={networkMetrics} />
                </CardContent>
            </Card>


        </div>
    );
}