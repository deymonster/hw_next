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
import { ConfirmModal } from "@/components/ui/elements/ConfirmModal"
import { useDeviceSelection } from "./DeviceTable";
import { useQueryClient } from "@tanstack/react-query"

interface DeviceActionsProps {
  device: Device
}

export function DeviceActions({ device }: DeviceActionsProps) {
  const t = useTranslations('dashboard.devices.actions')
  const { updateIp, deleteDevice } = useDevices()
  const { refreshDevices } = useDevicesContext()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { setSelectedDevice } = useDeviceSelection()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const queryClient = useQueryClient()
  

  const handleUpdateIp = async () => {
    try {
      setIsUpdating(true)
      setIsMenuOpen(false)
      toast.loading('Сканирование сети и поиск устройства...', { id: 'update-ip' })
      await updateIp(device.agentKey)
      toast.success(t('updateIpSuccess'), { id: 'update-ip' })
      refreshDevices()
    } catch (error) {
      toast.error(t('updateIpError'), { id: 'update-ip' })
    } finally {
      setIsUpdating(false)
    }
  }
  
  const handleDelete = async () => {
    try {
        setIsDeleting(true)
        setIsMenuOpen(false)
        toast.loading('Удаление устройства...', { id: 'delete-device' })
        
        // Оптимистично обновляем кэш React Query
        queryClient.setQueryData(['devices'], (oldData: Device[]) => {
            return oldData.filter(d => d.id !== device.id)
        })
        
        // Очищаем выбранное устройство
        setSelectedDevice(null)
        
        // Удаляем устройство из БД
        await deleteDevice(device.id)
        
        // В случае успеха, инвалидируем кэш для получения актуальных данных
        queryClient.invalidateQueries({ queryKey: ['devices'] })
        
        toast.success(t('deleteSuccess'), { id: 'delete-device' })
    } catch (error) {
        // В случае ошибки, отменяем оптимистичное обновление
        queryClient.invalidateQueries({ queryKey: ['devices'] })
        toast.error(t('deleteError'), { id: 'delete-device' })
    } finally {
        setIsDeleting(false)
    }
  }

  const handleEdit = () => {
    setIsMenuOpen(false)
    setSelectedDevice(device)
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation(); 
            handleUpdateIp();
          }}
          disabled={isUpdating}
          className={cn(
            "flex items-center",
            isUpdating ? "opacity-50 cursor-not-allowed" : ""
          )}
        >
          {isUpdating ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Сканирование...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('updateIp')}
          </>
        )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation()
            handleEdit()
          }}>
          <Edit className="mr-2 h-4 w-4" />
          {t('edit')}
        </DropdownMenuItem>
        <ConfirmModal
            heading={t('deleteConfirmTitle')}
            message={t('deleteConfirmMessage', { name: device.name})}
            onConfirm={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            onCancel={(e) => {
              if (e && e.stopPropagation) {
                e.stopPropagation();
              }
            }}
        >
            <DropdownMenuItem 
                className="text-destructive"
                disabled={isDeleting}
                onSelect={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('delete')}
            </DropdownMenuItem>
        </ConfirmModal>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}