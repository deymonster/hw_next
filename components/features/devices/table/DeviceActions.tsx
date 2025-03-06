'use client'

import { Button } from "@/components/ui/button"

import { MoreHorizontal, RefreshCw, Trash2, Edit } from "lucide-react"
import { useDevices } from "@/hooks/useDevices"
import { Device } from "@prisma/client"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdowmmenu"
import { useDevicesContext } from "@/contexts/DeviceContext"
import { cn } from "@/utils/tw-merge"

interface DeviceActionsProps {
  device: Device
}

export function DeviceActions({ device }: DeviceActionsProps) {
  const t = useTranslations('dashboard.devices.actions')
  const { updateIp } = useDevices()
  const { refreshDevices } = useDevicesContext()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdateIp = async () => {
    try {
      setIsUpdating(true)
      await updateIp(device.agentKey)
      toast.success(t('updateIpSuccess'))
      refreshDevices()
    } catch (error) {
      toast.error(t('updateIpError'))
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleUpdateIp}
          disabled={isUpdating}
          className={cn(
            "flex items-center",
            isUpdating ? "opacity-50 cursor-not-allowed" : ""
          )}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('updateIp')}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Edit className="mr-2 h-4 w-4" />
          {t('edit')}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {t('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}