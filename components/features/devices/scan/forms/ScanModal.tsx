'use client'

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useNetworkScanner } from "@/hooks/useNetworkScanner"
import { type TypeScanDeviceSchema, scanDeviceSchema } from "@/schemas/scan/scan.schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"


export function ScanModal() {
    const t = useTranslations('dashboard.devices.scanModal')
    const { startScan, discoveredAgents, isScanning, error, getSubnet } = useNetworkScanner()
    const [isOpen, setIsOpen ] = useState(false)

    const form = useForm<TypeScanDeviceSchema>({
        resolver: zodResolver(scanDeviceSchema),
        defaultValues: {
            subnet: ''
        }

    })

    const { isValid } = form.formState

    useEffect(() =>{
        if (isOpen) {
            const fetchSubnet = async () => {
                const subnet = await getSubnet({
                    onError: () => {
                        toast.error(t('subnetError'))
                    }
                })
                if (subnet) {
                    form.setValue('subnet', subnet)
                }
            }
            fetchSubnet()
        }
        
    }, [isOpen, form, getSubnet, t])

    async function onSubmit(data: TypeScanDeviceSchema) {
        await startScan(
            {subnet: data.subnet},
            {
                onSuccess: () => {
                    toast.success(t('successScanMessage'))
                },
                onError: () => {
                    toast.error(t('errorScanMessage'))
                }
            }
        )
    }
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>{t('trigger')}</Button>
            </DialogTrigger>
            <DialogContent className='max-h-[80vh] max-w-[800px] overflow-y-auto'>
                <DialogHeader>
                    <DialogTitle className='text-xl'>{t('heading')}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                            <FormField
                                control={form.control}
                                name='subnet'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {t('subnetLabel')}
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                {...field}
                                                placeholder="192.168.1.0/24"
                                                disabled={isScanning}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            
                        </form>
                </Form> 
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant='outline'>{t('cancelButton')}</Button>
                        </DialogClose>
                    </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

