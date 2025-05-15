'use client'

import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTranslations } from "next-intl"
import { ScrollArea } from "@/components/ui/scrollarea"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useDepartmentDevices } from "@/hooks/useDepartmentDevices"

const deviceSelectionSchema = z.object({
    devices: z.array(z.string()).min(1, "Выберите хотя бы одно устройство")
})

type DeviceSelectionForm = z.infer<typeof deviceSelectionSchema>

interface DeviceSelectionStepProps {
    departments: string[]
    onNext: (devices: string[]) => void
    onBack: () => void
}

export function DeviceSelectionStep({ departments, onNext, onBack }: DeviceSelectionStepProps) {
    const t = useTranslations('dashboard.inventory.modal.create.steps.devices')
    const { devices, isLoading } = useDepartmentDevices({ departments })
    const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())

    const form = useForm<DeviceSelectionForm>({
        resolver: zodResolver(deviceSelectionSchema),
        defaultValues: {
            devices: []
        }
    })

    const toggleDevice = (deviceId: string) => {
        const newSelectedDevices = new Set(selectedDevices)
        if (newSelectedDevices.has(deviceId)) {
            newSelectedDevices.delete(deviceId)
        } else {
            newSelectedDevices.add(deviceId)
        }
        setSelectedDevices(newSelectedDevices)
        form.setValue('devices', Array.from(newSelectedDevices), { shouldValidate: true })
    }

    const toggleAllDevices = (checked: boolean) => {
        if (checked) {
            const allDeviceIds = new Set(devices?.map(device => device.id) || [])
            setSelectedDevices(allDeviceIds)
            form.setValue('devices', Array.from(allDeviceIds), { shouldValidate: true })
        } else {
            setSelectedDevices(new Set())
            form.setValue('devices', [], { shouldValidate: true })
        }
    }

    const onSubmit = (data: DeviceSelectionForm) => {
        onNext(Array.from(selectedDevices))
    }

    return (
        <div className="space-y-8">
            <div>   
                <p className="text-sm text-muted-foreground">{t('description')}</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="devices"
                            render={() => (
                                <FormItem>
                                    <ScrollArea className="h-[300px] pr-4">
                                        <div className="space-y-4">
                                            {isLoading ? (
                                                <div className="flex items-center justify-center p-4">
                                                    <Loader2 className="h-6 w-6 animate-spin" />
                                                    <span className="ml-2">{t('loading')}</span>
                                                </div>
                                            ) : !devices || devices.length === 0 ? (
                                                <div className="text-center text-muted-foreground py-8">
                                                    <p>{t('noDevices')}</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-start space-x-3 pb-4 border-b">
                                                        <Checkbox
                                                            id="select-all"
                                                            checked={devices?.length > 0 && selectedDevices.size === devices?.length}
                                                            onCheckedChange={toggleAllDevices}
                                                        />
                                                        <label
                                                            htmlFor="select-all"
                                                            className="text-sm font-medium leading-none cursor-pointer"
                                                        >
                                                            {selectedDevices.size > 0 ? t('unselectAll') : t('selectAll')}
                                                        </label>
                                                    </div>
                                    
                                                    {devices.map(device => (
                                                        <div key={device.id} className="flex items-start space-x-3">
                                                            <Checkbox
                                                                id={device.id}
                                                                checked={selectedDevices.has(device.id)}
                                                                onCheckedChange={() => toggleDevice(device.id)}
                                                            />
                                                            <label
                                                                htmlFor={device.id}
                                                                className="text-sm font-medium leading-none cursor-pointer"
                                                            >
                                                                {device.name} ({device.ipAddress})
                                                            </label>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </ScrollArea>
                                    <div className="text-sm font-medium text-destructive mt-2">
                                        {form.formState.errors.devices && t('errors.required')}
                                    </div>
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={onBack}>
                            {t('backButton')}
                        </Button>
                        <Button type="submit">
                            {t('nextButton')}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}