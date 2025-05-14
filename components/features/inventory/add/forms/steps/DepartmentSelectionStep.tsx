'use client'

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { useDepartment } from "@/hooks/useDepartment"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { ScrollArea } from "@/components/ui/scrollarea"
import { useState } from "react"


const departmentSelectionSchema = z.object({
    departments: z.array(z.string()).min(1, "Выберите хотя бы один отдел")
})

type DepartmentSelectionForm = z.infer<typeof departmentSelectionSchema>

interface DepartmentSelectionStepProps {
    onNext: (departments: string[]) => void
}

export function DepartmentSelectionStep({ onNext }: DepartmentSelectionStepProps) {
    const t = useTranslations('dashboard.inventory.modal.create.steps.department')
    const { departments } = useDepartment()
    const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set())

    const form = useForm<DepartmentSelectionForm>({
        resolver: zodResolver(departmentSelectionSchema),
        defaultValues: {
            departments: []
        }
    })

    const toggleDepartment = (deptId: string) => {
        setSelectedDepts(prev => {
            const next = new Set(prev)
            if (next.has(deptId)) {
                next.delete(deptId)
            } else {
                next.add(deptId)
            }
            return next
        })
        form.setValue('departments', Array.from(selectedDepts), { shouldValidate: true })
    }

    const toggleAllDepartments = (checked: boolean) => {
        if (checked) {
            const allDeptIds = new Set(departments?.map(dept => dept.id) || [])
            setSelectedDepts(allDeptIds)
            form.setValue('departments', Array.from(allDeptIds), { shouldValidate: true })
        } else {
            setSelectedDepts(new Set())
            form.setValue('departments', [], { shouldValidate: true })
        }
    }

    const onSubmit = (data: DepartmentSelectionForm) => {
        onNext(Array.from(selectedDepts))
    }

    return (
        <div className="space-y-8">
            <div>   
                <p className="text-sm text-muted-foreground">{t('description')}</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3 pb-4 border-b">
                                <Checkbox
                                    id="select-all"
                                    checked={departments?.length > 0 && selectedDepts.size === departments?.length}
                                    onCheckedChange={toggleAllDepartments}
                                />
                                <label
                                    htmlFor="select-all"
                                    className="text-sm font-medium leading-none cursor-pointer"
                                >
                                    {selectedDepts.size > 0 ? t('unselectAll') : t('selectAll')}
                                </label>
                            </div>
                            
                            {departments?.map(dept => (
                                <div key={dept.id} className="flex items-start space-x-3">
                                    <Checkbox
                                        id={dept.id}
                                        checked={selectedDepts.has(dept.id)}
                                        onCheckedChange={() => toggleDepartment(dept.id)}
                                    />
                                    <label
                                        htmlFor={dept.id}
                                        className="text-sm font-medium leading-none cursor-pointer"
                                    >
                                        {dept.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="flex justify-end">
                        <Button type="submit">{t('nextButton')}</Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}