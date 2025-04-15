'use client'

import { Device } from "@prisma/client"
import { useDeviceMetrics } from "@/hooks/useDeviceMetrics"
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
    const { metrics, error: metricsError, isConnecting } = useDeviceMetrics(device.ipAddress)
  
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
  
        {/* Error State */}
        {metricsError && (
            <Card>
            <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-red-500">
                <span>Error loading metrics: {metricsError.message}</span>
                <Button 
                    variant="outline" 
                    size="default" 
                    onClick={() => window.location.reload()}
                >
                    Retry
                </Button>
                </div>
            </CardContent>
            </Card>
        )}
  
        {/* Loading State */}
        {(isConnecting || (!metrics && !metricsError)) && (
            <Card>
            <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{isConnecting ? 'Connecting to device...' : 'Loading metrics...'}</span>
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
              <ProcessList deviceId={device.ipAddress} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    )
  }
