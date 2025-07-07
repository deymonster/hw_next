'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

import { DepartmentSelectionStep } from './steps/DepartmentSelectionStep'
import { DeviceSelectionStep } from './steps/DeviceSelectionStep'
import { FinalStep } from './steps/FinalStep'
import { HardwareInfoStep } from './steps/HardwareInfoStep'

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { useDepartmentDevices } from '@/hooks/useDepartmentDevices'
import { useInventory } from '@/hooks/useInventory'

interface AddInventoryModalProps {
	isOpen: boolean
	onClose: () => void
}

type Step = 1 | 2 | 3 | 4

type HardwareInfoItem = {
	deviceId: string
	deviceName: string
	ipAddress: string
	processor: string | null
	motherboard: Record<string, unknown> | null
	memory: Record<string, unknown> | null
	storage: Record<string, unknown> | null
	networkCards: Record<string, unknown> | null
	videoCards: Record<string, unknown> | null
	diskUsage: Record<string, unknown> | null
	departmentId: string | null
	employeeId: string | null
	serialNumber: string | null
}

export function AddInventoryModal({ isOpen, onClose }: AddInventoryModalProps) {
	const t = useTranslations('dashboard.inventory.modal.create')
	const [currentStep, setCurrentStep] = useState<Step>(1)
	const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
	const [selectedDevices, setSelectedDevices] = useState<string[]>([])
	const [, setHardwareInfo] = useState<HardwareInfoItem[] | null>(null)
	const { devices } = useDepartmentDevices({
		departments: selectedDepartments
	})
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
		setCurrentStep(1)
		setSelectedDepartments([])
		setSelectedDevices([])
		setHardwareInfo(null)

		refetch()
		onClose()
	}

	const checkDevicesStatus = (deviceIds: string[]) => {
		console.log('[AddModal] Проверка статуса устройств:', deviceIds)
		if (!devices) {
			console.log('[AddModal] Нет данных об устройствах')
			return false
		}
		console.log('[AddModal] Все устройства:', devices)
		const selectedDevicesData = devices.filter(device =>
			deviceIds.includes(device.id)
		)
		console.log('[AddModal] Выбранные устройства:', selectedDevicesData)
		const offlineDevices = selectedDevicesData.filter(device => {
			console.log(
				`[AddModal] Проверка устройства ${device.name}, статус:`,
				device.onlineStatus
			)
			return device.onlineStatus && !device.onlineStatus.isOnline
		})

		if (offlineDevices.length > 0) {
			const offlineNames = offlineDevices.map(d => d.name).join(', ')
			toast.warning(
				`Некоторые устройства не в сети: ${offlineNames}. Информация о характеристиках может быть неполной.`
			)
		}

		return true
	}

	const steps = {
		1: (
			<DepartmentSelectionStep
				onNext={departments => {
					setSelectedDepartments(departments)
					setCurrentStep(2)
				}}
			/>
		),
		2: (
			<DeviceSelectionStep
				departments={selectedDepartments}
				onNext={devices => {
					setSelectedDevices(devices)
					if (checkDevicesStatus(devices)) {
						setCurrentStep(3)
					}
				}}
				onBack={() => setCurrentStep(1)}
			/>
		),
		3: (
			<HardwareInfoStep
				devices={
					devices?.filter(device =>
						selectedDevices.includes(device.id)
					) || []
				}
				onNext={info => {
					setHardwareInfo(info)
					setCurrentStep(4)
				}}
				onBack={() => setCurrentStep(2)}
			/>
		),

		4: <FinalStep onFinish={handleClose} onBack={() => setCurrentStep(3)} />
	}

	return (
		<Dialog
			open={isOpen}
			onOpenChange={open => {
				if (!open) handleClose()
			}}
		>
			<DialogContent className='max-w-xl'>
				<DialogHeader>
					<DialogTitle>{getStepTitle(currentStep)}</DialogTitle>
				</DialogHeader>
				{steps[currentStep]}
			</DialogContent>
		</Dialog>
	)
}
