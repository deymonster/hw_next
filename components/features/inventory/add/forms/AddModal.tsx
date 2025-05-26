'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { DepartmentSelectionStep } from "./steps/DepartmentSelectionStep"
import { DeviceSelectionStep } from "./steps/DeviceSelectionStep"
import { HardwareInfoStep } from "./steps/HardwareInfoStep"
import { useDepartmentDevices } from "@/hooks/useDepartmentDevices"
import { toast } from "sonner"
import { FinalStep } from "./steps/FinalStep"
import { useInventory } from "@/hooks/useInventory"

interface AddInventoryModalProps {
    isOpen: boolean
    onClose: () => void
}

type Step = 1 | 2 | 3 | 4

export function AddInventoryModal({ isOpen, onClose }: AddInventoryModalProps) {
    const t = useTranslations('dashboard.inventory.modal.create')
    const [currentStep, setCurrentStep] = useState<Step>(1)
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
    const [selectedDevices, setSelectedDevices] = useState<string[]>([])
    const [hardwareInfo, setHardwareInfo] = useState<any>(null)
    const { devices } = useDepartmentDevices({ departments: selectedDepartments })
    const { refetch } = useInventory()
    
    const getStepTitle = (step: Step) => {
        switch (step) {
            case 1:
                return t('steps.department.title')
            case 2:
                return t('steps.devices.title')
            case 3:
                return t('steps.hardware.title')
            case 4:
                return t('steps.final.title')
            default:
                return ''
        }
    }
    const handleClose = () => {
        refetch()
        onClose()
    }

    const checkDevicesStatus = (deviceIds: string[]) => {
        console.log('[AddModal] Проверка статуса устройств:', deviceIds);
        if (!devices) {
            console.log('[AddModal] Нет данных об устройствах');
            return false;
        }
        console.log('[AddModal] Все устройства:', devices);
        const selectedDevicesData = devices.filter(device => deviceIds.includes(device.id));
        console.log('[AddModal] Выбранные устройства:', selectedDevicesData);
        const offlineDevices = selectedDevicesData.filter(device => {
            console.log(`[AddModal] Проверка устройства ${device.name}, статус:`, device.onlineStatus);
            return device.onlineStatus && !device.onlineStatus.isOnline;
        });

        
        
        if (offlineDevices.length > 0) {
            const offlineNames = offlineDevices.map(d => d.name).join(', ');
            toast.warning(`Некоторые устройства не в сети: ${offlineNames}. Информация о характеристиках может быть неполной.`);
        }
        
        return true;
    }
    
    const steps = {
        1: <DepartmentSelectionStep 
            onNext={(departments) => {
                setSelectedDepartments(departments)
                setCurrentStep(2)
            }}
        />,
        2: <DeviceSelectionStep 
            departments={selectedDepartments}
            onNext={(devices) => {
                setSelectedDevices(devices)
                if (checkDevicesStatus(devices)) {
                    setCurrentStep(3)
                }
            }}
            onBack={() => setCurrentStep(1)}
        />,
        3: <HardwareInfoStep 
        devices={devices?.filter(device => selectedDevices.includes(device.id)) || []}
                onNext={(info) => {
                    setHardwareInfo(info)
                    setCurrentStep(4)
                }}
            onBack={() => setCurrentStep(2)}
        />,
        
        4: <FinalStep 
            onFinish={handleClose}
            onBack={() => setCurrentStep(3)}
        />
    } 

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        {getStepTitle(currentStep)}
                    </DialogTitle>
                </DialogHeader>
                {steps[currentStep]}
            </DialogContent>
        </Dialog>
    )
}