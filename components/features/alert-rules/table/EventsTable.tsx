'use client'

import { useTranslations } from "next-intl"
import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/elements/DataTable"
import { Event } from "@prisma/client"
import { CheckCheck, Loader2 } from "lucide-react"
import { createEventsColumns } from "./EventsColumns"
import { useEvents } from "@/hooks/useEvents"

import { EventDetail } from "../detail/EventDetail"

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
    const [events, setEvents] = useState<Event[]>([])
    const [total, setTotal] = useState<number>(0)
    const [currentPage, setCurrentPage] = useState<number>(1)
    const pageSize = 10

    const handleMarkAsRead = async (eventId: string) => {
        const result = await markAsRead(eventId, {});
        if (!result.error) {
            // Обновляем список событий после отметки как прочитанного
            loadEvents();
        }
    }

    const { loading, error, fetchAllEvents, fetchAndMarkAllAsRead, markAsRead } = useEvents()
    const columns = useMemo(() => createEventsColumns((key: string) => t(key), handleMarkAsRead), [t])
    
    const selectedEvent = useMemo(() => {
        if (!selectedEventId || !events) return null
        return events.find(event => event.id === selectedEventId) || null
    }, [selectedEventId, events])

    const loadEvents = async () => {
        const result = await fetchAllEvents({
            take: pageSize,
            skip: (currentPage - 1) * pageSize,
            orderBy: 'createdAt',
            orderDir: 'desc'
        })
        
        if (result.events) {
            setEvents(result.events)
            setTotal(result.total)
        }
    }

    useEffect(() => {
        loadEvents()
    }, [currentPage])

    if (loading) {
        return (
            <div className="flex items-center justify-center p-4 text-sm">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('loading')}
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 text-center text-destructive">
                {error}
            </div>
        )
    }


    const handleRowClick = (event: Event) => {
        setSelectedEventId(event.id)
    }

    const handleMarkAllAsRead = async () => {
        const result = await fetchAndMarkAllAsRead({})
        if (!result.error) {
            // Обновляем список событий после отметки всех как прочитанных
            loadEvents()
        }
    }

    return (
        <>
            {selectedEvent ? (
                <EventDetail 
                    event={selectedEvent} 
                    onBack={() => setSelectedEventId(null)} 
                />
            ) : (
                <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button variant="outline" onClick={handleMarkAllAsRead} className="h-8 text-xs w-full sm:w-auto">
                                <CheckCheck className="mr-1 h-3 w-3" />
                                <span className="hidden sm:inline">{t('markAllAsRead')}</span>
                                <span className="sm:hidden">Отметить все как прочитанные</span>
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

