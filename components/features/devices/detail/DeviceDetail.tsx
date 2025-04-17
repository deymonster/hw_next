'use client'

import { Device } from "@prisma/client"
import { useDeviceAllMetrics } from "@/hooks/useDeviceAllMetrics"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { ProcessList } from "./process/ProcessList"

interface DeviceDetailProps {
    device: Device
    onBack: () => void
  }

export function DeviceDetail({device, onBack}: DeviceDetailProps) {
    // Используем тот же хук для получения метрик
    const { 
      metrics, 
      status: { sseConnecting, wsConnected, wsLoading }, 
      errors: { sseError, processError },
      actions: { reconnect } 
    } = useDeviceAllMetrics(device.ipAddress)

    const handleRetry = () => {
      reconnect(); // Переподключение WebSocket
    };

    const getErrorMessage = (error: string | Error | null): string => {
      if (!error) return '';
      if (error instanceof Error) return error.message;
      return error;
  };
  
    return (
      <div className="space-y-6" data-device={device.ipAddress}>
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{device.name}</h2>
            <p className="text-muted-foreground">{device.ipAddress}</p>
          </div>
        </div>
  
        {/* Error State - обновлен для обоих типов ошибок */}
        {(sseError || processError) && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-2 text-red-500">
                            <span>Error loading metrics: {getErrorMessage(sseError || processError)}</span>
                            <Button 
                                variant="outline" 
                                size="default" 
                                onClick={handleRetry}
                            >
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
        )}
  
        {/* Loading State - обновлен с учетом обоих состояний */}
        {(sseConnecting || wsLoading) && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>
                                {sseConnecting ? 'Connecting to device...' : 
                                 wsLoading ? 'Loading process data...' : 
                                 'Loading metrics...'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
        )}
  
        {/* Metrics Content */}
        {metrics && (
          <Tabs defaultValue="system">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="hardware">Hardware</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="processes">Processes</TabsTrigger>
            </TabsList>
  
            <TabsContent value="system">
              {/* Здесь будет SystemSection */}
            </TabsContent>
  
            <TabsContent value="hardware">
              {/* Здесь будет HardwareSection */}
            </TabsContent>
  
            <TabsContent value="performance">
              {/* Здесь будет PerformanceSection */}
            </TabsContent>
  
            <TabsContent value="processes">
              {/* Здесь будет ProcessesSection */}
              <ProcessList 
                deviceId={device.ipAddress}
                data={metrics.processes}
                isLoading={wsLoading}
                isConnected={wsConnected}
                error={processError}
                lastUpdated={metrics.lastUpdated}
                onReconnect={reconnect}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    )
  }
