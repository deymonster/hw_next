'use client'

import { useAuth } from '@/hooks/useAuth'
import React from 'react'
import { SWRConfig} from 'swr'

export function SWRProvider({ children }: { children: React.ReactNode}) {
    const { user } = useAuth()

    return (
        <SWRConfig
            value={{
                revalidateOnFocus: true,
                revalidateOnReconnect: true,
                refreshInterval: 0,
                shouldRetryOnError: false,
                onError: (error) => {
                    if (error.status === 401) {
                        window.location.reload()
                    }
                }
            }}
        >
            {children}
        </SWRConfig>
    )
}