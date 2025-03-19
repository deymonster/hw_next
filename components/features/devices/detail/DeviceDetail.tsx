'use client'

import { Device, DeviceStatus } from "@prisma/client"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useDevices } from "@/hooks/useDevices"
import { useDeviceInfo } from "@/hooks/useDeviceInfo"
import { getAgentStatus } from "@/app/actions/prometheus.actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { ConfirmModal } from "@/components/ui/elements/ConfirmModal"
import { useDeviceSelection } from "../table/DeviceTable"
import { useDevicesContext } from "@/contexts/DeviceContext"

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
  const { getInfo } = useDeviceInfo()
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingIp, setIsUpdatingIp] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const { setSelectedDevice } = useDeviceSelection()
  const { refreshDevices } = useDevicesContext()

  // Fetch device info on load
  useEffect(() => {
    const fetchDeviceInfo = async () => {
      setIsLoading(true)
      try {
        const info = await getInfo(device.ipAddress)
        setDeviceInfo(info)
      } catch (error) {
        console.error('Failed to fetch device info:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDeviceInfo()
  }, [device.ipAddress, getInfo])

  // Periodically update device status
  useEffect(() => {
    const updateStatus = async () => {
      try {
        const result = await getAgentStatus(device.ipAddress)
        if (result.success && result.data && !Array.isArray(result.data)) {
          setStatus(result.data)
        }
      } catch (error) {
        console.error('Failed to update device status:', error)
      }
    }

    // Update immediately
    updateStatus()

    // Then update every 30 seconds
    const interval = setInterval(updateStatus, 30000)
    return () => clearInterval(interval)
  }, [device.ipAddress])

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      toast.loading('Deleting device...', { id: 'delete-device' })
      
      // Удаляем устройство
      const success = await deleteDevice(device.id)
      
      if (success) {
        toast.success('Device deleted successfully', { id: 'delete-device' })
        
        // Возвращаемся к таблице устройств и обновляем список
        setTimeout(() => {
          // Используем setTimeout, чтобы дать время серверу обработать удаление
          refreshDevices();
          setSelectedDevice(null);
        }, 300);
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

  // Обработчик отмены удаления (как при нажатии кнопки "Отмена", так и при клике вне модального окна)
  const handleCancelDelete = (e: any) => {
    // Предотвращаем всплытие события, чтобы не открывалась детальная информация
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    console.log('Delete cancelled');
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
                  {status ? (
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

      {deviceInfo && (
        <Tabs defaultValue="system">
          <TabsList>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="hardware">Hardware</TabsTrigger>
          </TabsList>
          <TabsContent value="system" className="space-y-4">
            {deviceInfo.systemInfo && (
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">OS</p>
                        <p className="text-sm text-muted-foreground">
                          {deviceInfo.systemInfo.os?.name} {deviceInfo.systemInfo.os?.version}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Hostname</p>
                        <p className="text-sm text-muted-foreground">
                          {deviceInfo.systemInfo.hostname}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Uptime</p>
                        <p className="text-sm text-muted-foreground">
                          {Math.floor(deviceInfo.systemInfo.uptime / 86400)} days
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Boot Time</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(deviceInfo.systemInfo.bootTime * 1000).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="hardware" className="space-y-4">
            {deviceInfo.hardwareInfo && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>CPU</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Model</p>
                          <p className="text-sm text-muted-foreground">
                            {deviceInfo.hardwareInfo.cpu?.model}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Cores</p>
                          <p className="text-sm text-muted-foreground">
                            {deviceInfo.hardwareInfo.cpu?.cores} cores / {deviceInfo.hardwareInfo.cpu?.threads} threads
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Memory</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Total</p>
                          <p className="text-sm text-muted-foreground">
                            {deviceInfo.hardwareInfo.memory?.total} GB
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Used</p>
                          <p className="text-sm text-muted-foreground">
                            {deviceInfo.hardwareInfo.memory?.used} GB ({deviceInfo.hardwareInfo.memory?.percent}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}