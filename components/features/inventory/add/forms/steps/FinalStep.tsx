'use client'

import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { useInventoryContext } from "@/contexts/InventoryContext"
import { useInventory } from "@/hooks/useInventory"
import { Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

interface FinalStepProps {
    onFinish: () => void
    onBack: () => void
}

export function FinalStep({ onFinish, onBack }: FinalStepProps) {
    const t = useTranslations('dashboard.inventory.modal.create.steps.final')
    const { state, resetState } = useInventoryContext()
    const { createInventory, addInventoryItem, refetch } = useInventory()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [currentItemIndex, setCurrentItemIndex] = useState(0)
    const [inventoryId, setInventoryId] = useState<string | null>(null)
    const { data: session } = useSession()
    
    const totalItems = state.inventoryItems.length
    const progress = totalItems > 0 ? Math.round((currentItemIndex / totalItems) * 100) : 0

    useEffect(() => {
        const addItems = async () => {
            if (!inventoryId || currentItemIndex >= totalItems) {
                if (currentItemIndex >= totalItems && inventoryId) {
                    setIsSuccess(true)
                    toast.success(t('successMessage'))
                    
                    // Сбрасываем состояние контекста
                    resetState()
                    refetch()
                    // Закрываем модальное окно через 1.5 секунды
                    setTimeout(() => {
                        onFinish()
                    }, 1500)
                }
                return
            }

            try {
                const item = state.inventoryItems[currentItemIndex]

                await addInventoryItem({
                    inventoryId,
                    item: {
                        deviceId: item.deviceId,
                        inventoryId: inventoryId,
                        deviceName: item.deviceName,
                        ipAddress: item.ipAddress,
                        processor: item.processor || undefined,
                        motherboard: item.motherboard,
                        memory: item.memory,
                        storage: item.storage, 
                        networkCards: item.networkCards,
                        videoCards: item.videoCards,
                        diskUsage: item.diskUsage,
                        serialNumber: item.serialNumber || undefined
                    }
                })

                setCurrentItemIndex(prev => prev + 1)
            } catch (error) {
                console.error('[FinalStep] Ошибка при добавлении элемента инвентаризации:', error)
                toast.error(t('errorAddingItem'))
            }

        }
        addItems()
    }, [inventoryId, currentItemIndex, totalItems])

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true)

            // Проверяем наличие пользователя
            if (!session?.user?.id) {
                toast.error('Не удалось определить пользователя')
                setIsSubmitting(false)
                return
            }

            // Создаем новую инвентаризацию и получаем её ID
            const newInventoryId = await createInventory(session.user.id)
            setInventoryId(newInventoryId)

        } catch (error) {
            console.error('[FinalStep] Ошибка при создании инвентаризации:', error)
            toast.error(t('errorMessage'))
            setIsSubmitting(false)
        }
    }
    return (
        <div className="space-y-8">
            <div>   
                <p className="text-sm text-muted-foreground">{t('description')}</p>
            </div>

            {isSuccess ? (
                <div className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                    <h3 className="text-xl font-medium">{t('successTitle')}</h3>
                    <p className="text-muted-foreground text-center mt-2">
                        {t('successDescription')}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-muted/50 p-4 rounded-lg">
                        <h3 className="font-medium mb-2">{t('summaryTitle')}</h3>
                        <p>{t('itemsCount', { count: state.inventoryItems.length })}</p>
                        <p>{t('dateInfo', { date: new Date().toLocaleDateString() })}</p>
                    </div>
                    
                    {inventoryId && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('processingItems', { current: currentItemIndex, total: totalItems })}
                            </p>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onBack}
                            disabled={isSubmitting || !!inventoryId}
                        >
                            {t('backButton')}
                        </Button>
                        <Button 
                            onClick={handleSubmit}
                            disabled={isSubmitting || !!inventoryId}
                        >
                            {isSubmitting || inventoryId ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('submittingButton')}
                                </>
                            ) : (
                                t('submitButton')
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}