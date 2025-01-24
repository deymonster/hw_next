'use client'

import { Fragment, useEffect, useState } from 'react'
import { findAndMarkAllAsRead } from '@/app/actions/notifications'
import { useCurrentSession } from '@/hooks/useCurrentSession'
import { Notification } from '@prisma/client'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Separator } from '@/components/ui/separator'
import { getNotificationIcon } from '@/utils/get-notification-icon'

interface NotificationsListProps {
  onRead?: () => void;
}

export function NotificationsList({ onRead }: NotificationsListProps) {
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
        const result = await findAndMarkAllAsRead(user.id)
        
        if (result.error) {
          setError(result.error)
        } else if (result.notifications) {
          setNotifications(result.notifications)
          onRead?.()
        }
      } catch (error) {
        setError('Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [user?.id, onRead])

  return (
    <div className="flex flex-col">
      <h2 className="text-center text-lg font-medium">{t('heading')}</h2>
      <Separator className="my-3"/>
      
      {loading ? (
        <div className="flex items-center justify-center gap-x-2 text-sm text-foreground">
          <Loader2 className="size-5 animate-spin" />
          {t('loading')}
        </div>
      ) : error ? (
        <div className="p-4 text-center text-sm text-destructive">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          {t('empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-2">
          {notifications.map((notification, index) => {
            const Icon = getNotificationIcon(notification.type)
            
            return (

              <Fragment key={index}>
                <div className="flex items-center gap-x-3 text-sm">
                  <div className="rounded-full bg-foreground p-2">
                        <Icon className="size-6 text-secondary"/>
                  </div>
                  <div>{notification.message}</div>
                </div>
                {index < notifications.length - 1 && (
                  <Separator className="my-3" />
                )}
                
              </Fragment>
              // <div
              //   key={notification.id}
              //   className="rounded-lg p-3 bg-muted/50"
              // >
              //   <div className="flex items-center gap-2">
              //     {Icon && <Icon className="size-4 shrink-0" />}
              //     <div className="flex-1">
              //       <div className="flex items-center justify-between">
              //         <h3 className="font-medium">{notification.title}</h3>
              //         <span className="text-xs text-muted-foreground">
              //           {new Date(notification.createdAt).toLocaleDateString()}
              //         </span>
              //       </div>
              //       <p className="mt-1 text-sm text-muted-foreground">
              //         {notification.message}
              //       </p>
              //     </div>
              //   </div>
              // </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
