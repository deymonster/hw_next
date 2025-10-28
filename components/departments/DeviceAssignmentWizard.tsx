'use client'

import { Device, DeviceType, Employee } from '@prisma/client'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { assignDevicesToEmployee, createDevice } from '@/app/actions/device'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
        Dialog,
        DialogContent,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scrollarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { EMPLOYEES_QUERY_KEY } from '@/hooks/useEmployee'
import { DEPARTMENTS_QUERY_KEY } from '@/hooks/useDepartment'
import { cn } from '@/utils/tw-merge'

interface DeviceAssignmentWizardProps {
        open: boolean
        onClose: () => void
        departmentId: string
        employees: Employee[]
        devices: Device[]
        onDevicesRefresh?: () => Promise<void> | void
        onEmployeesRefresh?: () => Promise<void> | void
}

const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
        WINDOWS: 'Windows',
        LINUX: 'Linux'
}

export function DeviceAssignmentWizard({
        open,
        onClose,
        departmentId,
        employees,
        devices,
        onDevicesRefresh,
        onEmployeesRefresh
}: DeviceAssignmentWizardProps) {
        const queryClient = useQueryClient()
        const [step, setStep] = useState(1)
        const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
        const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set())
        const [isSubmitting, setIsSubmitting] = useState(false)
        const [isRegistering, setIsRegistering] = useState(false)
        const [showRegistrationForm, setShowRegistrationForm] = useState(false)
        const [hasRegisteredDevice, setHasRegisteredDevice] = useState(false)
        const [newDeviceData, setNewDeviceData] = useState({
                name: '',
                ipAddress: '',
                agentKey: '',
                type: DeviceType.WINDOWS as DeviceType
        })

        const employeeMap = useMemo(
                () => new Map(employees.map(employee => [employee.id, employee])),
                [employees]
        )

        const departmentDevices = useMemo(
                () => devices.filter(device => device.departmentId === departmentId),
                [devices, departmentId]
        )

        const unassignedDevices = useMemo(
                () => devices.filter(device => !device.departmentId),
                [devices]
        )

        useEffect(() => {
                if (!selectedEmployeeId) {
                        setSelectedDeviceIds(new Set())
                        return
                }

                const assignedToEmployee = devices
                        .filter(device => device.employeeId === selectedEmployeeId)
                        .map(device => device.id)

                setSelectedDeviceIds(new Set(assignedToEmployee))
        }, [devices, selectedEmployeeId])

        useEffect(() => {
                if (!open) {
                        resetState()
                }
                // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [open])

        const resetState = () => {
                setStep(1)
                setSelectedEmployeeId('')
                setSelectedDeviceIds(new Set())
                setShowRegistrationForm(false)
                setHasRegisteredDevice(false)
                setNewDeviceData({
                        name: '',
                        ipAddress: '',
                        agentKey: '',
                        type: DeviceType.WINDOWS
                })
        }

        const closeWizard = () => {
                resetState()
                onClose()
        }

        const toggleDevice = (deviceId: string) => {
                setSelectedDeviceIds(prev => {
                        const next = new Set(prev)
                        if (next.has(deviceId)) {
                                next.delete(deviceId)
                        } else {
                                next.add(deviceId)
                        }
                        return next
                })
        }

        const handleRegisterDevice = async () => {
                if (!selectedEmployeeId) {
                        toast.error('Выберите сотрудника перед регистрацией устройства')
                        return
                }

                if (!newDeviceData.name || !newDeviceData.ipAddress || !newDeviceData.agentKey) {
                        toast.error('Заполните все поля для регистрации устройства')
                        return
                }

                try {
                        setIsRegistering(true)
                        const result = await createDevice({
                                ...newDeviceData,
                                departmentId,
                                employeeId: selectedEmployeeId
                        })

                        if (!result.success || !result.device) {
                                throw new Error(result.error || 'Не удалось зарегистрировать устройство')
                        }

                        setSelectedDeviceIds(prev => new Set(prev).add(result.device!.id))
                        setHasRegisteredDevice(true)
                        toast.success('Устройство зарегистрировано и назначено сотруднику')
                        setNewDeviceData({
                                name: '',
                                ipAddress: '',
                                agentKey: '',
                                type: DeviceType.WINDOWS
                        })
                        await onDevicesRefresh?.()
                        await onEmployeesRefresh?.()
                        queryClient.invalidateQueries({ queryKey: DEPARTMENTS_QUERY_KEY })
                        queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
                        queryClient.invalidateQueries({ queryKey: ['department-devices'] })
                } catch (error) {
                        console.error('register-device', error)
                        toast.error('Ошибка при регистрации устройства')
                } finally {
                        setIsRegistering(false)
                }
        }

        const handleSubmit = async () => {
                if (!selectedEmployeeId) {
                        toast.error('Выберите сотрудника для назначения устройств')
                        return
                }

                try {
                        setIsSubmitting(true)
                        const currentAssignments = devices.filter(
                                device => device.employeeId === selectedEmployeeId
                        )
                        const currentIds = new Set(currentAssignments.map(device => device.id))
                        const deviceIdsToAssign = Array.from(selectedDeviceIds).filter(
                                deviceId => !currentIds.has(deviceId)
                        )

                        if (deviceIdsToAssign.length > 0) {
                                const result = await assignDevicesToEmployee({
                                        departmentId,
                                        employeeId: selectedEmployeeId,
                                        deviceIds: deviceIdsToAssign
                                })

                                if (!result.success) {
                                        throw new Error(result.error || 'Не удалось назначить устройства')
                                }
                        }

                        await onDevicesRefresh?.()
                        await onEmployeesRefresh?.()
                        queryClient.invalidateQueries({ queryKey: DEPARTMENTS_QUERY_KEY })
                        queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
                        queryClient.invalidateQueries({ queryKey: ['department-devices'] })

                        if (deviceIdsToAssign.length === 0 && !hasRegisteredDevice) {
                                toast.info('Назначенные устройства не изменились')
                        } else {
                                toast.success('Назначение устройств обновлено')
                        }

                        closeWizard()
                } catch (error) {
                        console.error('assign-devices', error)
                        toast.error('Ошибка при назначении устройств')
                } finally {
                        setIsSubmitting(false)
                }
        }

        const renderDeviceRow = (device: Device) => {
                        const assignedEmployee =
                                device.employeeId && employeeMap.get(device.employeeId)
                        const isSelected = selectedDeviceIds.has(device.id)

                        return (
                                <div
                                        key={device.id}
                                        className={cn(
                                                'flex items-start justify-between rounded-lg border p-3 transition-colors',
                                                isSelected && 'border-primary bg-primary/5'
                                        )}
                                >
                                        <div className='flex items-start space-x-3'>
                                                <Checkbox
                                                        id={`device-${device.id}`}
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleDevice(device.id)}
                                                />
                                                <div>
                                                        <label
                                                                htmlFor={`device-${device.id}`}
                                                                className='cursor-pointer font-medium'
                                                        >
                                                                {device.name}
                                                        </label>
                                                        <div className='text-sm text-muted-foreground'>
                                                                {device.ipAddress}
                                                        </div>
                                                        <div className='mt-1 flex flex-wrap gap-2 text-xs'>
                                                                <Badge variant='outline'>
                                                                        {DEVICE_TYPE_LABEL[device.type]}
                                                                </Badge>
                                                                {assignedEmployee && (
                                                                        <Badge variant='secondary'>
                                                                                Назначено {assignedEmployee.firstName}{' '}
                                                                                {assignedEmployee.lastName}
                                                                        </Badge>
                                                                )}
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        )
        }

        return (
                <Dialog open={open} onOpenChange={openState => !openState && closeWizard()}>
                        <DialogContent className='max-w-3xl'>
                                <DialogHeader>
                                        <DialogTitle>Назначение устройств сотруднику</DialogTitle>
                                        <DialogDescription>
                                                Выберите сотрудника отдела и закрепите за ним существующие
                                                устройства или зарегистрируйте новые.
                                        </DialogDescription>
                                </DialogHeader>

                                <div className='mb-4 flex items-center justify-between text-sm text-muted-foreground'>
                                        <span>Шаг {step} из 2</span>
                                        {selectedEmployeeId && (
                                                <span>
                                                        Текущий сотрудник:{' '}
                                                        <span className='font-medium text-foreground'>
                                                                {employeeMap.get(selectedEmployeeId)?.firstName}{' '}
                                                                {employeeMap.get(selectedEmployeeId)?.lastName}
                                                        </span>
                                                </span>
                                        )}
                                </div>

                                {employees.length === 0 ? (
                                        <div className='flex items-center space-x-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
                                                <ShieldAlert className='h-5 w-5 text-destructive' />
                                                <span>
                                                        Добавьте сотрудников в отдел, прежде чем назначать им
                                                        устройства.
                                                </span>
                                        </div>
                                ) : step === 1 ? (
                                        <div className='space-y-3'>
                                                <Label htmlFor='employee-select'>Сотрудник</Label>
                                                <Select
                                                        value={selectedEmployeeId}
                                                        onValueChange={value => setSelectedEmployeeId(value)}
                                                >
                                                        <SelectTrigger id='employee-select'>
                                                                <SelectValue placeholder='Выберите сотрудника' />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                                {employees.map(employee => (
                                                                        <SelectItem key={employee.id} value={employee.id}>
                                                                                {[employee.firstName, employee.lastName]
                                                                                        .filter(Boolean)
                                                                                        .join(' ') ||
                                                                                        employee.email ||
                                                                                        'Без имени'}
                                                                        </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                </Select>
                                                <p className='text-sm text-muted-foreground'>
                                                        Выбор сотрудника автоматически покажет устройства, которые
                                                        уже закреплены за ним.
                                                </p>
                                        </div>
                                ) : (
                                        <div className='space-y-6'>
                                                <div className='space-y-3'>
                                                        <h3 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
                                                                Устройства отдела
                                                        </h3>
                                                        {departmentDevices.length === 0 ? (
                                                                <p className='text-sm text-muted-foreground'>
                                                                        В отделе пока нет устройств.
                                                                </p>
                                                        ) : (
                                                                <ScrollArea className='max-h-60 rounded-lg border p-3'>
                                                                        <div className='space-y-3'>
                                                                                {departmentDevices.map(renderDeviceRow)}
                                                                        </div>
                                                                </ScrollArea>
                                                        )}
                                                </div>

                                                <Separator />

                                                <div className='space-y-3'>
                                                        <h3 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
                                                                Не распределённые устройства
                                                        </h3>
                                                        {unassignedDevices.length === 0 ? (
                                                                <p className='text-sm text-muted-foreground'>
                                                                        Все устройства уже закреплены за отделами.
                                                                </p>
                                                        ) : (
                                                                <ScrollArea className='max-h-60 rounded-lg border p-3'>
                                                                        <div className='space-y-3'>
                                                                                {unassignedDevices.map(renderDeviceRow)}
                                                                        </div>
                                                                </ScrollArea>
                                                        )}
                                                </div>

                                                <Separator />

                                                <div className='space-y-3 rounded-lg border p-4'>
                                                        <button
                                                                type='button'
                                                                className='flex items-center gap-2 text-sm font-medium text-primary transition hover:underline'
                                                                onClick={() => setShowRegistrationForm(value => !value)}
                                                        >
                                                                <Plus className='h-4 w-4' /> Зарегистрировать новое
                                                                устройство
                                                        </button>
                                                        {showRegistrationForm && (
                                                                <div className='space-y-3'>
                                                                        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                                                                <div className='space-y-2'>
                                                                                        <Label htmlFor='device-name'>Название</Label>
                                                                                        <Input
                                                                                                id='device-name'
                                                                                                placeholder='Например, Рабочая станция'
                                                                                                value={newDeviceData.name}
                                                                                                onChange={event =>
                                                                                                        setNewDeviceData(prev => ({
                                                                                                                ...prev,
                                                                                                                name: event.target.value
                                                                                                        }))
                                                                                                }
                                                                                        />
                                                                                </div>
                                                                                <div className='space-y-2'>
                                                                                        <Label htmlFor='device-ip'>IP адрес</Label>
                                                                                        <Input
                                                                                                id='device-ip'
                                                                                                placeholder='192.168.0.10'
                                                                                                value={newDeviceData.ipAddress}
                                                                                                onChange={event =>
                                                                                                        setNewDeviceData(prev => ({
                                                                                                                ...prev,
                                                                                                                ipAddress: event.target.value
                                                                                                        }))
                                                                                                }
                                                                                        />
                                                                                </div>
                                                                        </div>
                                                                        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                                                                <div className='space-y-2'>
                                                                                        <Label htmlFor='device-key'>Ключ агента</Label>
                                                                                        <Input
                                                                                                id='device-key'
                                                                                                placeholder='Уникальный ключ'
                                                                                                value={newDeviceData.agentKey}
                                                                                                onChange={event =>
                                                                                                        setNewDeviceData(prev => ({
                                                                                                                ...prev,
                                                                                                                agentKey:
                                                                                                                        event.target
                                                                                                                                .value
                                                                                                        }))
                                                                                                }
                                                                                        />
                                                                                </div>
                                                                                <div className='space-y-2'>
                                                                                        <Label htmlFor='device-type'>Тип устройства</Label>
                                                                                        <Select
                                                                                                value={newDeviceData.type}
                                                                                                onValueChange={value =>
                                                                                                        setNewDeviceData(prev => ({
                                                                                                                ...prev,
                                                                                                                type: value as DeviceType
                                                                                                        }))
                                                                                                }
                                                                                        >
                                                                                                <SelectTrigger id='device-type'>
                                                                                                        <SelectValue />
                                                                                                </SelectTrigger>
                                                                                                <SelectContent>
                                                                                                        {Object.entries(DEVICE_TYPE_LABEL).map(
                                                                                                                ([value, label]) => (
                                                                                                                        <SelectItem
                                                                                                                                key={value}
                                                                                                                                value={value}
                                                                                                                        >
                                                                                                                                {label}
                                                                                                                        </SelectItem>
                                                                                                                )
                                                                                                        )}
                                                                                                </SelectContent>
                                                                                        </Select>
                                                                                </div>
                                                                        </div>
                                                                        <div className='flex justify-end'>
                                                                                <Button
                                                                                        onClick={handleRegisterDevice}
                                                                                        disabled={isRegistering}
                                                                                >
                                                                                        {isRegistering ? (
                                                                                                <span className='flex items-center gap-2'>
                                                                                                        <Loader2 className='h-4 w-4 animate-spin' />
                                                                                                        Регистрация...
                                                                                                </span>
                                                                                        ) : (
                                                                                                'Сохранить устройство'
                                                                                        )}
                                                                                </Button>
                                                                        </div>
                                                                </div>
                                                        )}
                                                </div>
                                        </div>
                                )}

                                <DialogFooter>
                                        <div className='flex w-full flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center'>
                                                <div>
                                                        {step === 2 && (
                                                                <Button
                                                                        variant='ghost'
                                                                        onClick={() => setStep(1)}
                                                                        disabled={isSubmitting || isRegistering}
                                                                >
                                                                        Назад
                                                                </Button>
                                                        )}
                                                </div>
                                                <div className='flex items-center gap-2'>
                                                        <Button
                                                                variant='outline'
                                                                onClick={closeWizard}
                                                                disabled={isSubmitting || isRegistering}
                                                        >
                                                                Отмена
                                                        </Button>
                                                        {step === 1 ? (
                                                                <Button
                                                                        onClick={() => setStep(2)}
                                                                        disabled={!selectedEmployeeId}
                                                                >
                                                                        Далее
                                                                </Button>
                                                        ) : (
                                                                <Button
                                                                        onClick={handleSubmit}
                                                                        disabled={isSubmitting || (!hasRegisteredDevice && selectedDeviceIds.size === 0)}
                                                                >
                                                                        {isSubmitting ? (
                                                                                <span className='flex items-center gap-2'>
                                                                                        <Loader2 className='h-4 w-4 animate-spin' />
                                                                                        Назначение...
                                                                                </span>
                                                                        ) : (
                                                                                'Назначить устройства'
                                                                        )}
                                                                </Button>
                                                        )}
                                                </div>
                                        </div>
                                </DialogFooter>
                        </DialogContent>
                </Dialog>
        )
}
