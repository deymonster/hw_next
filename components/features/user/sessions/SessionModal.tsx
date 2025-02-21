import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { UserSession } from "@/services/redis/types"
import { formatDate } from "@/utils/format-date"
import { useTranslations } from "next-intl"
import { PropsWithChildren } from "react"

interface SessionModalProps {
    session: UserSession | null | undefined
}

function formatIP(ip?: string) {
    if (!ip) return 'Unknown'
    if (ip === '::1' || ip === '127.0.0.1') return 'localhost'
    return ip
}


export function SessionModal({ children,  session }: PropsWithChildren<SessionModalProps>) {
    const t = useTranslations('dashboard.settings.sessions.sessionModal')
    return <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        
        <DialogContent>
            <DialogTitle className='text-xl'>{t('heading')}</DialogTitle>
            <div className='space-y-3'>
                <div className='flex items-center'>
                        <span className='font-medium'>
                            {t('device')}
                        </span>
                        <span className='ml-2 text-muted-foreground'>
                            {session?.metadata?.device?.browser}, {' '}{session?.metadata?.device?.os}
                        </span>
                </div>

                <div className='flex items-center'>
                        <span className='font-medium'>
                            {t('osVersion')}
                        </span>
                        <span className='ml-2 text-muted-foreground'>
                            {session?.metadata?.device?.osVersion}
                        </span>
                </div>

                <div className='flex items-center'>
                        <span className='font-medium'>
                            {t('createdAt')}
                        </span>
                        <span className='ml-2 text-muted-foreground'>
                            {formatDate(session?.createdAt ?? 0, true)}
                        </span>
                </div>

                <div className='flex items-center'>
                        <span className='font-medium'>
                            {t('ipAddress')}
                        </span>
                        <span className='ml-2 text-muted-foreground'>
                            {formatIP(session?.metadata?.network?.ip)}
                        </span>
                </div>
            </div>
        </DialogContent>
    </Dialog>
}