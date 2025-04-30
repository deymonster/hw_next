'use client'


import { Button } from "@/components/ui/button"
import { DepartmentWithCounts } from "@/hooks/useDepartment"
import { ArrowLeft, Building2, FileText, Monitor, Pencil, Trash, UserPlus, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import { useDepartment } from "@/hooks/useDepartment"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import { ConfirmModal } from "@/components/ui/elements/ConfirmModal"


interface DepartmentDetailProps {
    department: DepartmentWithCounts
    onBack: () => void
}

export function DepartmentDetail( {department, onBack }: DepartmentDetailProps) {
    const t = useTranslations('dashboard.departments')
    const { delete: deleteDepartment } = useDepartment()
    const [isDeleting, setIsDeleting] = useState(false)
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
                    <p className="text-sm-text-muted-foreground">{department.description}</p>
                </div>

                <div className="flex items-center space-x-2">
                <Button variant="outline" size="icon">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmModal
                        heading="Удаление отдела"
                        message={`Вы действительно хотите удалить отдел "${department.name}"? Это действие нельзя отменить.`}
                        onConfirm={(e) => {
                            e.stopPropagation();
                            handleDelete();
                        }}
                        onCancel={(e) => {
                            if (e && e.stopPropagation) {
                                e.stopPropagation();
                            }
                        }}
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
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="info">Информация</TabsTrigger>
                    <TabsTrigger value="employees">Сотрудники</TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                    <Card>
                    <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">Название</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">{department.name}</p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">Описание</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">
                                        {department.description || 'Нет описания'}
                                    </p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Monitor className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">Количество устройств</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-6">{department.deviceCount}</p>
                                </div>

                                <div className="bg-secondary/20 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">Количество сотрудников</h3>
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
                            <div className="flex justify-end mb-4">
                                <Button>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Добавить сотрудника
                                </Button>
                            </div>
                            {/* Здесь будет таблица сотрудников */}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )

}