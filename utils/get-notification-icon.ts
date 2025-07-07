import { EventType } from '@prisma/client'
import {
	AlertTriangle,
	Bell,
	CheckIcon,
	HardDrive,
	Info,
	type LucideIcon,
	Settings,
	User
} from 'lucide-react'

export function getNotificationIcon(type: EventType): LucideIcon {
	switch (type) {
		case EventType.SYSTEM:
			return CheckIcon
		case EventType.USER:
			return User
		case EventType.DEVICE:
			return HardDrive
		case EventType.ALERT:
			return AlertTriangle
		case EventType.INFO:
			return Info
		default:
			return Bell
	}
}
