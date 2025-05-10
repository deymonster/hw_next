'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import { useEmployees } from "@/hooks/useEmployee"
import { Department, Device, DeviceStatus, Employee } from "@prisma/client"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import { ConfirmModal } from "@/components/ui/elements/ConfirmModal"
import { Button } from "@/components/ui/button"
import { Briefcase, Building2, Mail, Monitor, Phone, Trash2, User2 } from "lucide-react"
import { EditEmployeeModal } from "../edit/forms/EditModal"
import { ManageDevicesModal } from "../device/forms/ManageDevicesModal"

type EmployeeWithRelations = Employee & {
    department?: Department | null;
    devices?: (Device & {
        status?: {
            isOnline: boolean;
            lastSeen: Date | null;
            deviceStatus: DeviceStatus;
        }
    })[];
}

interface EmployeeDetailProps {
    employee: EmployeeWithRelations
    onBack: () => void
}

export  function EmployeeDetail({ employee, onBack }: EmployeeDetailProps) {
    const t = useTranslations('dashboard.employees')
    const { deleteEmployee } = useEmployees()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDevicesModalOpen, setIsDevicesModalOpen] = useState(false)
    const queryClient = useQueryClient()

    const handleDelete = async () => {
        try {
            setIsDeleting(true)
            queryClient.setQueryData(['employees'], (old: EmployeeWithRelations[] | undefined) =>
                old? old.filter(emp => emp.id!== employee.id) : []
            )

            await deleteEmployee({ 
                id: employee.id, 
                unassignDevices: true 
            })
            toast.success('Сотрудник успешно удален')
            onBack()
        } catch (error) {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
            toast.error('Ошибка при удалении сотрудника')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className='space-y-6 mt-6'>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{`${employee.firstName} ${employee.lastName}`}</h2>
                    <p className="text-sm text-muted-foreground">{employee.position}</p>
                </div>

                <div className="flex items-center space-x-2">
                    <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setIsEditModalOpen(true)}
                    >
                        <User2 className="h-4 w-4" />
                    </Button>

                    <ConfirmModal
                        heading={t('modal.delete.confirmTitle')}
                        message={t('modal.delete.confirmMessage', { name: `${employee.firstName} ${employee.lastName}` })}
                        onConfirm={handleDelete}
                    >
                        <Button 
                            variant="destructive" 
                            size="icon"
                            disabled={isDeleting}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </ConfirmModal>
                </div>
            </div>

            <EditEmployeeModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                employee={employee}
            />

            <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="info">{t('detail.info')}</TabsTrigger>
                    <TabsTrigger value="devices">{t('detail.devices')}</TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <User2 className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">{t('detail.fullName')}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">
                                        {`${employee.firstName} ${employee.lastName}`}
                                    </p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">{t('detail.department')}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">
                                        {employee.department?.name || t('detail.departmentNotSet')}
                                    </p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">{t('detail.email')}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">{employee.email}</p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">{t('detail.phone')}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">
                                        {employee.phone || t('detail.phoneNotSet')}
                                    </p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">{t('detail.position')}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">{employee.position}</p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Monitor className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">{t('detail.deviceCount')}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">
                                        {employee.devices?.length || 0}
                                    </p>
                                </div>
                            </div>
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
                            {!employee.devices || employee.devices.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <p>{t('detail.noDevices')}</p>
                                </div>
                            ) : (
                                employee.devices.map(device => (
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
                                                            className={`w-2 h-2 rounded-full ${device.status?.isOnline ? 'bg-green-500' : 'bg-red-500'}`}
                                                            title={device.status?.isOnline ? t('detail.online') : t('detail.offline')}
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                {t('detail.lastActivity')}: {device.status?.lastSeen 
                                                    ? new Date(device.status.lastSeen).toLocaleString() 
                                                    : t('detail.noData')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            </div>
                            <ManageDevicesModal
                                isOpen={isDevicesModalOpen}
                                onClose={() => setIsDevicesModalOpen(false)}
                                employee={employee}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

        </div>
    )
}