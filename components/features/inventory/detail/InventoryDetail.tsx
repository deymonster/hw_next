import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmModal } from "@/components/ui/elements/ConfirmModal"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InventoryWithRelations, useInventory } from "@/hooks/useInventory"
import { Inventory } from "@prisma/client"
import { useQueryClient } from "@tanstack/react-query"
import { Building2, Download, FileText, Monitor, Package2, Trash, Mail, Phone, Briefcase } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

interface InventoryDetailProps {
    inventory: InventoryWithRelations
    onBack: () => void
}

export function InventoryDetail({ inventory, onBack}:  InventoryDetailProps) {
    const t = useTranslations('dashboard.inventory')
    const { deleteInventoryAsync, exportToExcel } = useInventory()
    const [isDeleting, setIsDeleting] = useState(false)
    const queryClient = useQueryClient()

    
    const handleDelete = async () => {
        try {
            setIsDeleting(true)
            queryClient.setQueryData(['inventory'], (old: Inventory[] | undefined) => 
                old ? old.filter(item => item.id !== inventory.id) : []
            )
            
            await deleteInventoryAsync(inventory.id)
            toast.success('Инвентаризация успешно удалена')
            onBack()
        } catch (error) {
            queryClient.invalidateQueries({ queryKey: ['inventory'] })
            toast.error('Ошибка при удалении инвентаризации')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleExport = async () => {
        try {
            await exportToExcel(inventory.id)
            toast.success('Экспорт успешно завершен')
        } catch (error) {
            toast.error('Ошибка при экспорте')
        }
    } 

    return (
        <div className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{t('detail.inventory')} от {new Date(inventory.startDate).toLocaleDateString()}</h2>
                    <p className="text-sm text-muted-foreground">ID: {inventory.id.substring(0, 8)}</p>
                </div>

                <div className="flex items-center space-x-2">
                    <Button 
                        variant="outline" 
                        size="icon"
                        onClick={handleExport}
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                    
                    <ConfirmModal
                        heading="Удаление инвентаризации"
                        message={`Вы действительно хотите удалить инвентаризацию от ${new Date(inventory.startDate).toLocaleDateString()}? Это действие нельзя отменить.`}
                        onConfirm={handleDelete}
                    >
                        <Button 
                            variant="destructive" 
                            size="icon"
                            disabled={isDeleting}
                        >
                            <Trash className="h-4 w-4" />
                        </Button>
                    </ConfirmModal>
                </div>
            </div>

            <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">{t('detail.info')}</TabsTrigger>
                    <TabsTrigger value="devices">{t('detail.devices')}</TabsTrigger>
                    <TabsTrigger value="departments">{t('detail.departments')}</TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Package2 className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">{t('detail.date')}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">{new Date(inventory.startDate).toLocaleString()}</p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">{t('detail.items')}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">
                                        {inventory.items?.length || 0} {t('detail.itemsCount')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="devices">
                <Card>
                    <CardContent className="pt-6">
                    {inventory.items && inventory.items.length > 0 ? (
                            <div className="space-y-4">
                                {inventory.items.map((item, index) => (
                                    <div key={item.id} className="bg-secondary/20 rounded-lg p-4">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <Monitor className="h-4 w-4 text-muted-foreground" />
                                            <h3 className="font-medium">{item.device?.name || 'Неизвестное устройство'}</h3>
                                        </div>
                                        <div className="space-y-2">
                                            {/* Информация об устройстве */}
                                            <h4 className="text-sm font-medium">Информация об устройстве:</h4>
                                            <p className="text-xs text-muted-foreground">
                                                IP-адрес: {item.device?.ipAddress || 'Н/Д'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Тип: {item.device?.type || 'Н/Д'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Статус: {item.device?.status || 'Н/Д'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Серийный номер: {item.device?.serialNumber || 'Н/Д'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Последнее обновление: {item.device?.lastUpdate ? new Date(item.device.lastUpdate).toLocaleString() : 'Н/Д'}
                                            </p>
                                        </div>
                                        {item.employee && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium">Информация о сотруднике:</h4>
                                                <p className="text-xs text-muted-foreground">
                                                    ФИО: {item.employee.firstName} {item.employee.lastName}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                                    Email: {item.employee.email || 'Н/Д'}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                                    Телефон: {item.employee.phone || 'Н/Д'}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Briefcase className="h-3 w-3 text-muted-foreground" />
                                                    Должность: {item.employee.position || 'Н/Д'}
                                                </p>
                                            </div>
                                        )}
                                        {inventory.items && index < inventory.items.length - 1 && (
                                            <Separator className="my-4" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                <Monitor className="h-8 w-8 mx-auto mb-2" />
                                <p>{t('detail.noDevices')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

                <TabsContent value="departments">
                    <Card>
                        <CardContent className="pt-6">
                            {inventory.departments && inventory.departments.length > 0 ? (
                                <div className="space-y-4">
                                    {inventory.departments.map(department => (
                                        <div key={department.id} className="bg-secondary/20 rounded-lg p-4">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                                <h3 className="font-medium">{department.name}</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground pl-6">
                                                {department.description || 'Нет описания'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-8">
                                    <Building2 className="h-8 w-8 mx-auto mb-2" />
                                    <p>{t('detail.noDepartments')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )

}