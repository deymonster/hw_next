'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import { useEvents } from "@/hooks/useEvents"
import { Event } from "@prisma/client"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bell, Calendar, CheckCheck, Info, MessageSquare, Shield, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface EventDetailProps {
  event: Event
  onBack: () => void
}

export function EventDetail({ event, onBack }: EventDetailProps) {
  const t = useTranslations('dashboard.monitoring.events')
  const { markAsRead } = useEvents()
  const [isMarking, setIsMarking] = useState(false)

  const handleMarkAsRead = async () => {
    try {
      setIsMarking(true)
      await markAsRead(event.id, {})
      toast.success(t('markAsReadSuccess'))
    } catch (error) {
      toast.error(t('markAsReadError'))
    } finally {
      setIsMarking(false)
    }
  }

  // Функция для определения цвета бейджа в зависимости от приоритета
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return '';
    }
  }

  return (
    <div className='space-y-6 mt-6'>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToList')}
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {!event.isRead && (
            <Button 
              variant="outline" 
              size="default" 
              onClick={handleMarkAsRead}
              disabled={isMarking}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              {t('actions.markAsRead')}
            </Button>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold">{event.title}</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge className={`${getSeverityColor(event.severity)}`}>
            {t(`severities.${event.severity.toLowerCase()}`)}
          </Badge>
          <Badge variant="outline">
            {t(`eventTypes.${event.type.toLowerCase()}`)}
          </Badge>
          <Badge variant={event.isRead ? "secondary" : "default"}>
            {event.isRead ? t('status.read') : t('status.unread')}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="details">{t('detail.info')}</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-secondary/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">{t('message')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                    {event.message}
                  </p>
                </div>

                <div className="bg-secondary/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">{t('type')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {t(`eventTypes.${event.type.toLowerCase()}`)}
                  </p>
                </div>

                <div className="bg-secondary/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">{t('severity')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {t(`severities.${event.severity.toLowerCase()}`)}
                  </p>
                </div>

                <div className="bg-secondary/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">{t('status.title')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {event.isRead ? t('status.read') : t('status.unread')}
                  </p>
                </div>

                <div className="bg-secondary/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">{t('createdAt')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="bg-secondary/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">{t('detail.id')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {event.id}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}