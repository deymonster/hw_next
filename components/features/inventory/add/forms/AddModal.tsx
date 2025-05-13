'use client'

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useState } from "react"
// import { DepartmentSelectionStep } from "./steps/DepartmentSelectionStep"
// import { DeviceSelectionStep } from "./steps/DeviceSelectionStep"
// import { HardwareInfoStep } from "./steps/HardwareInfoStep"
// import { FinalStep } from "./steps/FinalStep"

interface AddInventoryModalProps {
    isOpen: boolean
    onClose: () => void
}

type Step = 1 | 2 | 3 | 4

export function AddInventoryModal({ isOpen, onClose }: AddInventoryModalProps) {
    const [currentStep, setCurrentStep] = useState<Step>(1)
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
    const [selectedDevices, setSelectedDevices] = useState<string[]>([])
    const [hardwareInfo, setHardwareInfo] = useState<any>(null)

    // const steps = {
    //     1: <DepartmentSelectionStep 
    //         onNext={(departments) => {
    //             setSelectedDepartments(departments)
    //             setCurrentStep(2)
    //         }}
    //     />,
    //     2: <DeviceSelectionStep 
    //         departments={selectedDepartments}
    //         onNext={(devices) => {
    //             setSelectedDevices(devices)
    //             setCurrentStep(3)
    //         }}
    //         onBack={() => setCurrentStep(1)}
    //     />,
    //     3: <HardwareInfoStep 
    //         devices={selectedDevices}
    //         onNext={(info) => {
    //             setHardwareInfo(info)
    //             setCurrentStep(4)
    //         }}
    //         onBack={() => setCurrentStep(2)}
    //     />,
    //     4: <FinalStep 
    //         departments={selectedDepartments}
    //         devices={selectedDevices}
    //         hardwareInfo={hardwareInfo}
    //         onFinish={onClose}
    //         onBack={() => setCurrentStep(3)}
    //     />
    // }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                {/* {steps[currentStep]} */}
            </DialogContent>
        </Dialog>
    )
}