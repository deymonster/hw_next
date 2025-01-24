import { NotificationType } from '@prisma/client'
import { Bell, CheckIcon, HardDrive, Info, AlertTriangle, Settings, User, type LucideIcon } from 'lucide-react'

export function getNotificationIcon(type: NotificationType): LucideIcon {
  switch (type) {
    case NotificationType.SYSTEM:
      return CheckIcon
    case NotificationType.USER:
      return User
    case NotificationType.DEVICE:
        return HardDrive
    case NotificationType.ALERT:
      return AlertTriangle
    case NotificationType.INFO:
      return Info
    default:
      return Bell
  }
}