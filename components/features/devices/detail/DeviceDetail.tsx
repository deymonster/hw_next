'use client'

import { Device, DeviceStatus } from "@prisma/client"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useDevices } from "@/hooks/useDevices"
import { useDeviceMetrics } from "@/hooks/useDeviceMetrics"
import { getAgentStatus } from "@/app/actions/prometheus.actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { ConfirmModal } from "@/components/ui/elements/ConfirmModal"
import { useDeviceSelection } from "../table/DeviceTable"
import { useDevicesContext } from "@/contexts/DeviceContext"
import { useDeviceStatus } from "@/hooks/useDeviceStatus"
import { useQueryClient } from '@tanstack/react-query'
import { Progress } from "@/components/ui/progress"


interface DeviceDetailProps {
  device: Device
  onBack: () => void
}

const getStatusBadge = (status: DeviceStatus) => {
  const variants: Record<DeviceStatus, "default" | "secondary" | "destructive" | "outline"> = {
    ACTIVE: "default",
    INACTIVE: "secondary",
    PENDING: "outline",
    DECOMMISSIONED: "destructive"
  }
  
  return <Badge variant={variants[status]}>{status}</Badge>
}

export function DeviceDetail({ device, onBack }: DeviceDetailProps) {
  const t = useTranslations('dashboard.devices')
  const { deleteDevice, updateIp } = useDevices()
  const { metrics, error: metricsError } = useDeviceMetrics(device.ipAddress)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingIp, setIsUpdatingIp] = useState(false)
  const { setSelectedDevice } = useDeviceSelection()
  const { refreshDevices } = useDevicesContext()
  const queryClient = useQueryClient()

  // Используем хук для проверки статуса
  const { data: statusData, isLoading: isStatusLoading } = useDeviceStatus(device)
  const status = statusData?.data

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      toast.loading('Deleting device...', { id: 'delete-device' })
      
      // Удаляем устройство
      const success = await deleteDevice(device.id)
      
      if (success) {
        // Инвалидируем кэш devices и stats сразу после успешного удаления
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['devices'] }),
          queryClient.invalidateQueries({ queryKey: ['device-stats'] })
        ])
        
        toast.success('Device deleted successfully', { id: 'delete-device' })
        
        // Возвращаемся к таблице устройств
        onBack()
      } else {
        toast.error('Failed to delete device', { id: 'delete-device' })
      }
    } catch (error) {
      console.error('Error deleting device:', error)
      toast.error('Failed to delete device', { id: 'delete-device' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateIp = async () => {
    try {
      setIsUpdatingIp(true)
      toast.loading('Updating IP address...', { id: 'update-ip' })
      await updateIp(device.agentKey)
      toast.success('IP address updated successfully', { id: 'update-ip' })
    } catch (error) {
      toast.error('Failed to update IP address', { id: 'update-ip' })
    } finally {
      setIsUpdatingIp(false)
    }
  }

  // Обработчик отмены удаления
  const handleCancelDelete = (e: any) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{device.name}</h2>
            <p className="text-muted-foreground">{device.ipAddress}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="default" 
            onClick={handleUpdateIp}
            disabled={isUpdatingIp}
          >
            {isUpdatingIp ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Update IP
          </Button>
          <ConfirmModal
            heading="Delete Device"
            message={`Are you sure you want to delete ${device.name}? This action cannot be undone.`}
            onConfirm={handleDelete}
            onCancel={handleCancelDelete}
          >
            <Button variant="secondary" size="default" disabled={isDeleting} className="text-red-500 hover:bg-red-50">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </ConfirmModal>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Current device status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Status:</span>
                <span>{getStatusBadge(device.status)}</span>
              </div>
              <div className="flex justify-between">
                <span>Agent Status:</span>
                <span>
                  {status && !Array.isArray(status) ? (
                    <Badge variant={status.up ? "default" : "destructive"}>
                      {status.up ? "Online" : "Offline"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Unknown</Badge>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Seen:</span>
                <span>{device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Update:</span>
                <span>{new Date(device.lastUpdate).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Info</CardTitle>
            <CardDescription>Basic device information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Type:</span>
                <span>{device.type}</span>
              </div>
              <div className="flex justify-between">
                <span>Agent Key:</span>
                <span className="text-xs truncate max-w-[150px]">{device.agentKey}</span>
              </div>
              <div className="flex justify-between">
                <span>Serial Number:</span>
                <span>{device.serialNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Tag:</span>
                <span>{device.deviceTag || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Device location information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Location:</span>
                <span>{device.locationId ? 'Assigned' : 'Not assigned'}</span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{new Date(device.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {metricsError ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-red-500">Error loading metrics: {metricsError.message}</div>
          </CardContent>
        </Card>
      ) : !metrics ? (
        <Card>
          <CardContent className="pt-6">
            <div>Loading metrics...</div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="system">
          <TabsList>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="hardware">Hardware</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="processes">Processes</TabsTrigger>
          </TabsList>

          {/* Системная информация */}
          <TabsContent value="system" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Manufacturer</p>
                    <p className="text-sm text-muted-foreground">
                      {metrics.systemInfo.manufacturer || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Model</p>
                    <p className="text-sm text-muted-foreground">
                      {metrics.systemInfo.model || 'N/A'}
                    </p>
                  </div>
                      <div>
                        <p className="text-sm font-medium">OS</p>
                        <p className="text-sm text-muted-foreground">
                      {metrics.systemInfo.osArchitecture} {metrics.systemInfo.osVersion}
                        </p>
                      </div>
                      <div>
                    <p className="text-sm font-medium">Serial Number</p>
                    <p className="text-sm text-muted-foreground">
                      {metrics.systemInfo.serialNumber || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Информация об оборудовании */}
          <TabsContent value="hardware" className="space-y-4">
            {/* CPU */}
            <Card>
              <CardHeader>
                <CardTitle>CPU</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Model</p>
                        <p className="text-sm text-muted-foreground">
                      {metrics.hardwareInfo.cpu.model || 'N/A'}
                    </p>
                  </div>
                  {metrics.processorMetrics && (
                    <>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">CPU Usage</span>
                          <span className="text-sm text-muted-foreground">
                            {metrics.processorMetrics.usage.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={metrics.processorMetrics.usage} className="h-2" />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Temperature</p>
                        <div className="grid grid-cols-2 gap-2">
                          {metrics.processorMetrics.temperature.sensors.map((sensor, index) => (
                            <div key={index} className="flex justify-between">
                              <span className="text-sm">{sensor.name}:</span>
                              <span className="text-sm text-muted-foreground">
                                {sensor.value}°C
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between font-medium">
                            <span className="text-sm">Average:</span>
                            <span className="text-sm">
                              {metrics.processorMetrics.temperature.average}°C
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Memory */}
            <Card>
              <CardHeader>
                <CardTitle>Memory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Memory Usage</span>
                      <span className="text-sm text-muted-foreground">
                        {metrics.hardwareInfo.memory.usage.percent}%
                      </span>
                    </div>
                    <Progress 
                      value={metrics.hardwareInfo.memory.usage.percent} 
                      className="h-2"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-sm font-medium">Total</p>
                      <p className="text-sm text-muted-foreground">
                        {metrics.hardwareInfo.memory.usage.total} GB
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Used</p>
                      <p className="text-sm text-muted-foreground">
                        {metrics.hardwareInfo.memory.usage.used} GB
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Free</p>
                        <p className="text-sm text-muted-foreground">
                        {metrics.hardwareInfo.memory.usage.free} GB
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disks */}
            <Card>
              <CardHeader>
                <CardTitle>Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {metrics.hardwareInfo.disks.map((disk, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium">{disk.model}</p>
                        <Badge variant={disk.health === 'OK' ? 'default' : 'destructive'}>
                          {disk.health}
                        </Badge>
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Usage</span>
                          <span className="text-sm text-muted-foreground">
                            {disk.usage.percent}%
                          </span>
                        </div>
                        <Progress value={disk.usage.percent} className="h-2" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="font-medium">Total</p>
                          <p className="text-muted-foreground">{disk.usage.total} GB</p>
                        </div>
                        <div>
                          <p className="font-medium">Used</p>
                          <p className="text-muted-foreground">{disk.usage.used} GB</p>
                        </div>
                        <div>
                          <p className="font-medium">Free</p>
                          <p className="text-muted-foreground">{disk.usage.free} GB</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          {/* Performance */}
          <TabsContent value="performance" className="space-y-4">
            {/* Network Performance */}
                <Card>
                  <CardHeader>
                <CardTitle>Network Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                <div className="space-y-6">
                  {metrics.networkMetrics.map((network, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium">{network.name}</p>
                        <Badge variant={network.status === 'up' ? 'default' : 'destructive'}>
                          {network.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Receive</p>
                          <p className="text-sm text-muted-foreground">
                            {network.performance.rx.toFixed(2)} MB/s
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Transmit</p>
                          <p className="text-sm text-muted-foreground">
                            {network.performance.tx.toFixed(2)} MB/s
                          </p>
                        </div>
                      </div>
                      {(network.errors > 0 || network.droppedPackets > 0) && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Errors</p>
                            <p className="text-sm text-red-500">{network.errors}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Dropped Packets</p>
                            <p className="text-sm text-red-500">{network.droppedPackets}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                    </div>
                  </CardContent>
                </Card>

            {/* Disk Performance */}
                <Card>
                  <CardHeader>
                <CardTitle>Disk Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                <div className="space-y-6">
                  {metrics.diskMetrics.map((disk, index) => (
                    <div key={index} className="space-y-2">
                      <p className="text-sm font-medium">{disk.model}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Read</p>
                          <p className="text-sm text-muted-foreground">
                            {(disk.performance.rx / 1024 / 1024).toFixed(2)} MB/s
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Write</p>
                          <p className="text-sm text-muted-foreground">
                            {(disk.performance.tx / 1024 / 1024).toFixed(2)} MB/s
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Processes */}
          <TabsContent value="processes">
            <Card>
              <CardHeader>
                <CardTitle>Active Processes</CardTitle>
                <CardDescription>Top processes by CPU usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.processList.slice(0, 10).map((process, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium">{process.name}</p>
                        <p className="text-sm text-muted-foreground">PID: {process.pid}</p>
                      </div>
                      <div className="space-y-1">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-muted-foreground">CPU</span>
                            <span className="text-sm text-muted-foreground">
                              {process.metrics.cpu.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={process.metrics.cpu} className="h-1" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Memory</span>
                            <span className="text-sm text-muted-foreground">
                              {process.metrics.memory.percent.toFixed(1)}%
                              ({process.metrics.memory.mb.toFixed(0)} MB)
                            </span>
                          </div>
                          <Progress value={process.metrics.memory.percent} className="h-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                    </div>
                  </CardContent>
                </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}