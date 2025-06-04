'use client'

import { useTranslations } from "next-intl"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/elements/DataTable"
import { Event } from "@prisma/client"
import { ArrowLeft, Trash2, CheckCheck } from "lucide-react"
import { createEventsColumns } from "./EventsColumns"

// Временные данные для демонстрации
const mockEvents: Event[] = [
    {
        id: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
        type: "ALERT",
        severity: "HIGH",
        title: "Высокая температура CPU",
        message: "Температура процессора превысила 80°C",
        isRead: false,
        userId: "user1"
    },
    {
        id: "2",
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date(Date.now() - 3600000),
        type: "SYSTEM",
        severity: "MEDIUM",
        title: "Обновление системы",
        message: "Система была обновлена до версии 2.1.0",
        isRead: true,
        userId: "user1"
    }
]

export function EventsTable() {
    const t = useTranslations('dashboard.monitoring.events')
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
    const [events, setEvents] = useState<Event[]>(mockEvents)
    const [isLoading] = useState(false)
    const columns = useMemo(() => createEventsColumns((key: string) => t(key)), [t])

    const selectedEvent = useMemo(() => {
        if (!selectedEventId || !events) return null
        return events.find(event => event.id === selectedEventId) || null
    }, [selectedEventId, events])

    if (isLoading) {
        return <div className="flex items-center justify-center p-4 text-sm">Загрузка событий...</div>
    }

    const handleRowClick = (event: Event) => {
        setSelectedEventId(event.id)
    }

    const handleClearAllEvents = async () => {
        // TODO: Implement clear all events
        console.log('Clear all events')
        setEvents([])
    }

    const handleMarkAllAsRead = async () => {
        // TODO: Implement mark all as read
        console.log('Mark all as read')
        setEvents(events.map(event => ({ ...event, isRead: true })))
    }

    return (
        <>
            {selectedEvent ? (
                <div>
                    <Button
                        variant="ghost"
                        onClick={() => setSelectedEventId(null)}
                        className="mb-4 h-8 text-xs"
                    >
                        <ArrowLeft className="mr-1 h-3 w-3" />
                        {t('backToList')}
                    </Button>
                    <div className="bg-white p-4 sm:p-6 rounded-lg border">
                        <h3 className="text-base sm:text-lg font-semibold mb-2">{selectedEvent.title}</h3>
                        <p className="text-gray-600 mb-4 text-sm">{selectedEvent.message}</p>
                        <div className="text-xs sm:text-sm text-gray-500 space-y-1">
                            <p>Тип: {selectedEvent.type}</p>
                            <p>Приоритет: {selectedEvent.severity}</p>
                            <p>Создано: {selectedEvent.createdAt.toLocaleString()}</p>
                            <p>Статус: {selectedEvent.isRead ? 'Прочитано' : 'Не прочитано'}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button variant="outline" onClick={handleMarkAllAsRead} className="h-8 text-xs w-full sm:w-auto">
                                <CheckCheck className="mr-1 h-3 w-3" />
                                <span className="hidden sm:inline">{t('markAllAsRead')}</span>
                                <span className="sm:hidden">Отметить все как прочитанные</span>
                            </Button>
                            <Button variant="destructive" onClick={handleClearAllEvents} className="h-8 text-xs w-full sm:w-auto">
                                <Trash2 className="mr-1 h-3 w-3" />
                                <span className="hidden sm:inline">{t('clearAll')}</span>
                                <span className="sm:hidden">Очистить все</span>
                            </Button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <DataTable
                            columns={columns}
                            data={events || []}
                            onRowClick={handleRowClick}
                            filtering={{
                                enabled: true,
                                column: 'title',
                                placeholder: t('searchPlaceholder')
                            }}
                            pagination={{
                                enabled: true,
                                pageSize: 10,
                                showPageSize: true,
                                showPageNumber: true
                            }}
                        />
                    </div>
                    
                </div>
            )}
        </>
    )
}