import { Card, CardContent } from '@/components/ui/card';

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
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                    {/* TODO: Add metrics display */}
                </CardContent>
            </Card>
        </div>
    );
}