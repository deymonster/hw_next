'use client'

import { Device } from "@prisma/client"
import { useTranslations } from "next-intl"


interface DeviceDetailProps {
  device: Device
  onBack: () => void
}

export function DeviceDetail({ device, onBack }: DeviceDetailProps) {
  const t = useTranslations('dashboard.devices')

  return (
    <div>DeviceDetail</div>
  )
}