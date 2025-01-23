'use client'

import { useEffect, useState } from 'react'
import { findNotificationsByUser } from '@/app/actions/notifications'
import { useCurrentSession } from '@/hooks/useCurrentSession'
import { Notification } from '@prisma/client'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Separator } from '@/components/ui/separator'

export function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useCurrentSession()

  const t = useTranslations('layout.header.headerMenu.profileMenu.notifications')

  useEffect(() => {
    async function fetchNotifications() {
      if (!user?.id) return

      try {
        setLoading(true)
        const result = await findNotificationsByUser(user.id)
        
        if (result.error) {
          setError(result.error)
        } else if (result.notifications) {
          setNotifications(result.notifications)
        }
      } catch (error) {
        setError('Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [user?.id])

  if (loading) {
    return null
  }
  
  return (
    <>
        <h2 className="text-center text-lg font-medium">{t('heading')}</h2>
        <Separator className="my-3"/>
    </>
  )
   
  
 
}
