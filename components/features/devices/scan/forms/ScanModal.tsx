'use client'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
import { useDeviceInfo } from "@/hooks/useDeviceInfo"
import { useDevices } from "@/hooks/useDevices"
import { DeviceType } from "@prisma/client"


export function ScanModal() {
    const t = useTranslations('dashboard.devices.scanModal')

    const { startScan, stopScan, discoveredAgents, isScanning, getSubnet, resetScanner } = useNetworkScanner()
    const { getInfo, isLoading, addDevice } = useDeviceInfo()
    const [isOpen, setIsOpen ] = useState(false)
    const [selectedDevices, setSelectedDevices] = useState<string[]>([])
    const [localAgents, setLocalAgents] = useState<typeof discoveredAgents>([])
    
    const { addNewDevice } = useDevices({
        onError: (error) => {
            toast.error('Failed to add device to DB')
        },
        onSuccess: () => {
            toast.success('Устройство успешно добавлено')
        }
    })

    
    const form = useForm<TypeScanDeviceSchema>({
        resolver: zodResolver(scanDeviceSchema),
        defaultValues: {
            subnet: ''
        }

    })

    const { isValid } = form.formState

    const handleModalClose = () => {
        if (isScanning) {
            
            stopScan()
        }
        resetScanner()
        setSelectedDevices([])
        setLocalAgents([])
        form.reset()
        setIsOpen(false)
    }

    useEffect(() =>{
        if (isOpen) {
            resetScanner()
            setSelectedDevices([])
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
        return () => {
            if (isScanning) {
                
                stopScan()
            }
        }
        
    }, [isOpen, form, getSubnet, t, resetScanner, isScanning, stopScan])
    

    async function onSubmit(data: TypeScanDeviceSchema) {
        
        if (isScanning) {
            
            stopScan()
        }
        setSelectedDevices([])
        setLocalAgents([])
        
        const result = await startScan(
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

            
        if (Array.isArray(result)) {
            if (result.length > 0) {

                setLocalAgents(result)
            } else {
                
                setLocalAgents([])
            }
        } else {

            setLocalAgents([])
        }
    }

    const handleAddDevices = async () => {
        try {
            
            let addedDevicesCount = 0;

            for (const ipAddress of selectedDevices) {
                const agent = localAgents.find(a => a.ipAddress === ipAddress)
                if (!agent) {
                    throw new Error(`Agent not found for ${ipAddress}`)
                }

                // Проверка зарегистрирован ли агент уже или нет
                if (agent.isRegistered) {
                    
                    toast.error(`Устройство ${agent.agentKey} уже зарегистрировано`)
                    continue
                }
                // Добавление в Prometheus
                const addResult = await addDevice(ipAddress)
                if (!addResult) {
                    throw new Error(`Failed to add target for ${ipAddress}`)
                }
                // Получаем инфо из Prometheus
                const info = await getInfo(ipAddress)
                if (!info) {
                    throw new Error(`Failed to get info for ${ipAddress}`)
                }
                
                
                if (!info.systemInfo.name || !info.systemInfo.uuid) {
                    throw new Error(`Missing required info for device ${ipAddress}`);
                }
                // Добавляем новое устройство в БД
                const deviceResult = await addNewDevice({
                    name: info.systemInfo.name!,
                    ipAddress: ipAddress,
                    agentKey: info.systemInfo.uuid!,
                    type: DeviceType.WINDOWS
                })
                if (!deviceResult) {
                    throw new Error(`Failed to add device for ${ipAddress}`)
                }
                addedDevicesCount++;
            }
            if (addedDevicesCount > 0) {
                toast.success(`Добавлено устройств: ${addedDevicesCount}`)
                handleModalClose()
            }
        } catch (error) {
            console.error('[SCAN_MODAL] Failed to add devices:', error)
            toast.error('Ошибка добавления устройства')
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                handleModalClose()
            } else {
                setIsOpen(open)
            }
            
        }}>
            <DialogTrigger asChild onClick={() => {
                resetScanner()
                setSelectedDevices([])
                form.reset()
                setIsOpen(true)
            }}>
                <Button>{t('trigger')}</Button>
            </DialogTrigger>
            <DialogContent className='max-h-[80vh] max-w-[800px] overflow-y-auto'>
                <DialogHeader>
                    <DialogTitle className='text-xl'>{t('heading')}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                            <div className='w-full  space-y-6'>
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
                            
                                <div className='w-full'>
                                    
                                    <ScanTable
                                        data={localAgents || []}
                                        isLoading={isScanning}
                                        onRowSelectionChange={setSelectedDevices}
                                    />
                                </div>
                            </div>
              
                        <DialogFooter className='gap-2'>
                            
                            {localAgents && localAgents.length > 0 && (
                                <Button
                                    type='button'
                                    variant='default'
                                    disabled={selectedDevices.length === 0 || isLoading}
                                    onClick={handleAddDevices}
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

