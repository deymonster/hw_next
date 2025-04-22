import { Card, CardContent } from '@/components/ui/card';
import { CpuMetrics } from './metrics/CpuMetrics';
import { NetworkMetrics } from './metrics/NetworkMetrics';

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
            <Card>
                <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">CPU Usage</h3>
                    <CpuMetrics metrics={processorMetrics} />
                </CardContent>
                
            </Card>
            
            <Card>
                <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">Network Usage</h3>
                    <NetworkMetrics metrics={networkMetrics} />
                </CardContent>
            </Card>


        </div>
    );
}