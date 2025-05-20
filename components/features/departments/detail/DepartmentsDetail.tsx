'use client'

import { Button } from "@/components/ui/button"
import { DepartmentWithCounts } from "@/hooks/useDepartment"
import { Building2, FileText, Monitor, Pencil, Trash, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import { useDepartment } from "@/hooks/useDepartment"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import { ConfirmModal } from "@/components/ui/elements/ConfirmModal"
import { EditDepartmentModal } from "../edit/forms/EditModal"
import { ManageDepartmentDevicesModal } from "../device/ManageDepartmentDevicesModal"

interface DepartmentDetailProps {
    department: DepartmentWithCounts
    onBack: () => void
}

export function DepartmentDetail( {department, onBack }: DepartmentDetailProps) {
    const t = useTranslations('dashboard.departments')
    const { deleteDepartment } = useDepartment()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDevicesModalOpen, setIsDevicesModalOpen] = useState(false)
    const queryClient = useQueryClient()

    const handleDelete = async () => {
        try {
            setIsDeleting(true)
            // Оптимистичное обновление UI
            queryClient.setQueryData(['departments'], (old: DepartmentWithCounts[] | undefined) => 
                old ? old.filter(dep => dep.id !== department.id) : []
            )
            
            await deleteDepartment(department.id)
            toast.success('Отдел успешно удален')
            onBack()
        } catch (error) {
            // В случае ошибки инвалидируем кэш для получения актуальных данных
            queryClient.invalidateQueries({ queryKey: ['departments'] })
            toast.error('Ошибка при удалении отдела')
        } finally {
            setIsDeleting(false)
        }
    }


    return (
        <div className="space-y-6 mt-6">
           
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{department.name}</h2>
                    <p className="text-sm text-muted-foreground">{department.description || 'Нет описания'}</p>
                </div>

                
                <div className="flex items-center space-x-2">
                            <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => setIsEditModalOpen(true)}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <ConfirmModal
                                heading="Удаление отдела"
                                message={`Вы действительно хотите удалить отдел "${department.name}"? Это действие нельзя отменить.`}
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
            <EditDepartmentModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                department={department}
            />

            <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">{t('detail.info')}</TabsTrigger>
                    <TabsTrigger value="employees">{t('detail.employees')}</TabsTrigger>
                    <TabsTrigger value="devices">Устройства</TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">{t('detail.departmentName')}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">{department.name}</p>
                                </div>



                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">{t('detail.departmentDescription')}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">
                                        {department.description || t('detail.noDepartmentDescription')}
                                    </p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Monitor className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">{t('detail.deviceCount')}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">{department.deviceCount}</p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">{t('detail.employeeCount')}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">{department.employeesCount}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="employees">
                    <Card>
                        <CardContent className="pt-6">
                        {department.employees && department.employees.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4 font-medium text-sm text-muted-foreground pb-2 border-b">
                                        <div>{t('detail.fullName')}</div>
                                        <div>{t('detail.position')}</div>
                                        <div>{t('detail.contacts')}</div>
                                    </div>
                                    {department.employees.map((employee) => (
                                        <div key={employee.id} className="grid grid-cols-3 gap-4 text-sm">
                                            <div className="flex items-center space-x-2">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                <span>{`${employee.lastName} ${employee.firstName}`}</span>
                                            </div>
                                            <div>{employee.position}</div>
                                            <div className="space-y-1">
                                                {employee.email && (
                                                    <div className="text-muted-foreground">{employee.email}</div>
                                                )}
                                                {employee.phone && (
                                                    <div className="text-muted-foreground">{employee.phone}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-8">
                                    <Users className="h-8 w-8 mx-auto mb-2" />
                                    <p>{t('detail.noEmployee')}</p>
                                </div>
                            )}
                            
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="devices">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium">{t('detail.assignedDevices')}</h3>
                                <Button onClick={() => setIsDevicesModalOpen(true)}>
                                    <Monitor className="mr-2 h-4 w-4" />
                                    {t('detail.manageDevices')}
                                </Button>
                            </div>
                            
                            <div className="space-y-4">
                                {!department.devices || department.devices.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        <Monitor className="h-8 w-8 mx-auto mb-2" />
                                        <p>{t('detail.noDevices')}</p>
                                    </div>
                                ) : (
                                    department.devices.map(device => (
                                        <div key={device.id} className="bg-secondary/20 rounded-lg p-4 hover:bg-secondary/30 transition-colors">
                                            <div className="flex items-start space-x-4">
                                                <div className="bg-primary/10 rounded-full p-2">
                                                    <Monitor className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-sm font-medium">
                                                            {device.name}
                                                        </h3>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-xs bg-secondary rounded-full px-2 py-1">
                                                                {device.ipAddress}
                                                            </span>
                                                            <div 
                                                                className={`w-2 h-2 rounded-full ${device.deviceStatus?.isOnline ? 'bg-green-500' : 'bg-red-500'}`}
                                                                title={device.deviceStatus?.isOnline ? t('detail.online') : t('detail.offline')}
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {t('detail.lastActivity')}: {device.deviceStatus?.lastSeen 
                                                            ? new Date(device.deviceStatus.lastSeen).toLocaleString() 
                                                            : t('detail.noData')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <ManageDepartmentDevicesModal
                                isOpen={isDevicesModalOpen}
                                onClose={() => setIsDevicesModalOpen(false)}
                                department={department}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )

}