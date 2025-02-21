import { CardContainer } from "@/components/ui/elements/CardContainer"
import type { UserSession } from "@/services/redis/types"
import { getBrowserIcon } from "@/utils/get-browser-icon"
import { useTranslations } from "next-intl"
import { SessionModal } from "./SessionModal"
import { Button } from "@/components/ui/button"
import { useSessionManager } from "@/hooks/useSessionManager"
import { ConfirmModal } from "@/components/ui/elements/ConfirmModal"
import { toast } from "sonner"



interface SessionitemProps {
    session: UserSession | null | undefined
    isCurrentSession?: boolean
    onSessionRemoved?: () => void
}


export function SessionItem({session, isCurrentSession, onSessionRemoved}: SessionitemProps) {
    const t = useTranslations('dashboard.settings.sessions.sessionItem')
    
    const { removeSession, loading: isLoadingRemove } = useSessionManager()
    
    const handleRemoveSession = async (sessionId: string) => {
        try {
            await removeSession(sessionId, {
                onSuccess: () => {
                    toast.success(t('succesMessage'))
                    onSessionRemoved?.() 
                },
                onError: () => {
                    toast.error(t('errorMessage'))
                }
            })
        } catch (error) {
            console.log('Failed to remove session', error)
        }
    }

    if (!session || !session.metadata || !session.metadata.device) {
        return null
    }

    const Icon = getBrowserIcon(session.metadata.device.browser)
    return <CardContainer 
        heading={`${session.metadata.device?.browser}, ${session.metadata.device?.os}`}
        description={(session.metadata.device.type)}
        Icon={Icon}
        rightContent={
            <div className='flex items-center gap-x-4'>
                {!isCurrentSession && (
                    <ConfirmModal 
                            heading={t('confirmModal.heading')}
                            message={t('confirmModal.message')}
                            onConfirm={() => handleRemoveSession(session.sessionId)}
                    >
                        <Button variant='secondary' disabled={isLoadingRemove}>{t('deleteButton')}</Button>
                    </ConfirmModal>
                )}
                <SessionModal session={session}>
                    <Button>{t('detailButton')}</Button>
                </SessionModal>
            </div>
        }
    
    />

    
}

