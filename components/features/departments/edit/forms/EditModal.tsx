'use client'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { useDepartment } from "@/hooks/useDepartment"
import { toast } from "sonner"
import { AddDepartmentForm, addDepartmentSchema } from "@/schemas/department/addDepartment.schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useCallback, useState } from "react"
import { Loader2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { Department } from "@prisma/client"

interface EditDepartmentModalProps {
    isOpen: boolean
    onClose: () => void
    department: Department
}

export function EditDepartmentModal({ isOpen, onClose, department }: EditDepartmentModalProps) {
    const t = useTranslations('dashboard.departments.modal.edit')
    const queryClient = useQueryClient()
    const { update } = useDepartment()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<AddDepartmentForm>({
        resolver: zodResolver(addDepartmentSchema),
        defaultValues: {
            name: department.name,
            description: department.description || ''
        }
    })
    const { isValid } = form.formState

    const handleModalClose = useCallback(() => {
        form.reset()
        onClose()
    }, [form, onClose])

    const onSubmit = async (data: AddDepartmentForm) => {
        try {
            setIsSubmitting(true)
            await update(department.id, data)
            queryClient.invalidateQueries({ queryKey: ['departments'] })
            toast.success(t('success'))
            handleModalClose()
        } catch (error) {
            toast.error(t('error'))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleModalClose() }}>
            <DialogContent className="dialog-content">
                <DialogHeader>
                    <DialogTitle>{t('heading')}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('nameLabel')}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            {...field}
                                            disabled={isSubmitting}
                                            
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('descriptionLabel')}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            {...field}
                                            disabled={isSubmitting}
                                            
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={!isValid || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('submitting')}
                                    </>
                                ) : (
                                    t('submitButton')
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}