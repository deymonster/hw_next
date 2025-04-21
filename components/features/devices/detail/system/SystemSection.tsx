import { Card, CardContent } from '@/components/ui/card';
import { DeviceMetrics } from '@/services/prometheus/prometheus.interfaces';

interface SystemSectionProps {
    systemInfo: DeviceMetrics['systemInfo'] | undefined;
}

export function SystemSection({ systemInfo }: SystemSectionProps) {
    if (!systemInfo) return null;

    const systemDetails = [
        { label: 'Device Name', value: systemInfo.model },
        { label: 'Manufacturer', value: systemInfo.manufacturer },
        { label: 'OS Architecture', value: systemInfo.osArchitecture },
        { label: 'OS Version', value: systemInfo.osVersion },
        { label: 'Serial Number', value: systemInfo.serialNumber }
    ];
    

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">System Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {systemDetails.map(({ label, value }) => (
                            <div key={label} className="flex flex-col space-y-1">
                                <span className="text-sm text-muted-foreground">
                                    {label}
                                </span>
                                <span className="font-medium">
                                    {value || 'N/A'}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}