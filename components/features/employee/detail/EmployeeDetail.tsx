'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import { useEmployees } from "@/hooks/useEmployee"
import { Department, Device, Employee } from "@prisma/client"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import { ConfirmModal } from "@/components/ui/elements/ConfirmModal"
import { Button } from "@/components/ui/button"
import { Briefcase, Building2, Mail, Monitor, Phone, Trash2, User2 } from "lucide-react"
import { EditEmployeeModal } from "../edit/forms/EditModal"

type EmployeeWithRelations = Employee & {
    department?: Department | null;
    devices?: Device[];
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
                    <TabsTrigger value="info">Информация</TabsTrigger>
                    <TabsTrigger value="devices">Устройства</TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <User2 className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">ФИО</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">
                                        {`${employee.firstName} ${employee.lastName}`}
                                    </p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">Отдел</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">
                                        {employee.department?.name || 'Не назначен'}
                                    </p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">Email</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">{employee.email}</p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">Телефон</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">
                                        {employee.phone || 'Не указан'}
                                    </p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">Должность</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">{employee.position}</p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Monitor className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">Количество устройств</h3>
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
                            <div className="flex justify-end mb-4">
                                <Button>
                                    <Monitor className="mr-2 h-4 w-4" />
                                    Добавить устройство
                                </Button>
                            </div>
                            {/* Здесь будет таблица устройств */}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

        </div>
    )
}