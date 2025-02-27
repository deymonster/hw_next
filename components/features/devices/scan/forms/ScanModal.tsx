'use client'

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useNetworkScanner } from "@/hooks/useNetworkScanner"
import { type TypeScanDeviceSchema, scanDeviceSchema } from "@/schemas/scan/scan.schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { ScanTable } from "../../table/ScanTable"


export function ScanModal() {
    const t = useTranslations('dashboard.devices.scanModal')
    const { startScan, discoveredAgents, isScanning, error, getSubnet } = useNetworkScanner()
    const [isOpen, setIsOpen ] = useState(false)
    const [selectedDevices, setSelectedDevices] = useState<string[]>([])
    const [scanResults, setScanResults] = useState<Array<any>>([])

    const form = useForm<TypeScanDeviceSchema>({
        resolver: zodResolver(scanDeviceSchema),
        defaultValues: {
            subnet: ''
        }

    })

    const { isValid } = form.formState

    const handleModalClose = () => {
        setScanResults([])
        setSelectedDevices([])
        form.reset()
        setIsOpen(false)
    }

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
        setScanResults([])
        setSelectedDevices([])

        await startScan(
            {subnet: data.subnet},
            {
                onSuccess: () => {
                    setScanResults(discoveredAgents || [])
                    console.log('Discovered agents:', discoveredAgents)
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
            <DialogTrigger asChild onClick={() => setIsOpen(true)}>
                <Button>{t('trigger')}</Button>
            </DialogTrigger>
            <DialogContent className='max-h-[80vh] max-w-[800px] overflow-y-auto'>
                <DialogHeader>
                    <DialogTitle className='text-xl'>{t('heading')}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                            <div className='w-full max-w-[720px] mx-auto'>
                                <FormField
                                    control={form.control}
                                    name='subnet'
                                    render={({ field }) => (
                                        <FormItem className='w-full'>
                                            <FormLabel>
                                                {t('subnetLabel')}
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    {...field}
                                                    className='w-full'
                                                    placeholder="192.168.1.0/24"
                                                    disabled={isScanning}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className='mt-5 w-full max-w-[720px] mx-auto'>
                                <ScanTable
                                    data={discoveredAgents || []}
                                    isLoading={isScanning}
                                    onRowSelectionChange={setSelectedDevices}
                                />
                            </div>
              
                        <DialogFooter className='gap-2'>
                            
                            {discoveredAgents && discoveredAgents.length > 0 && (
                                <Button
                                    type='button'
                                    variant='default'
                                    disabled={selectedDevices.length === 0}
                                    onClick={() => {
                                        console.log('Adding devices:', selectedDevices)
                                    }}
                                >
                                    Добавить
                                </Button>
                            )}

                            <Button
                                type='submit'
                                disabled={!isValid || isScanning}
                            >
                                {isScanning ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    t('scanButton')
                                )}
                            </Button>
                            
                        </DialogFooter>
                        </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

