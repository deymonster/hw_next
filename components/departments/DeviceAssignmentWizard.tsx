'use client'

import { Device, DeviceType, Employee } from '@prisma/client'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { assignDevicesToEmployee, createDevice } from '@/app/actions/device'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/components/ui/alertDialog'
import { Badge } from '@/components/ui/badge'
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
import { ScrollArea } from '@/components/ui/scrollarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { DEPARTMENTS_QUERY_KEY } from '@/hooks/useDepartment'
import { EMPLOYEES_QUERY_KEY } from '@/hooks/useEmployee'
import { cn } from '@/utils/tw-merge'

interface DeviceAssignmentWizardProps {
	open: boolean
	onClose: () => void
	departmentId: string
	employees: (Employee & { department?: { name: string } })[]
	devices: Device[]
	onDevicesRefresh?: () => Promise<void> | void
	onEmployeesRefresh?: () => Promise<void> | void
}

interface DeviceWithEmployee extends Device {
	employee?: Employee & { department?: { name: string } }
}

interface ReassignmentConfirmation {
	device: DeviceWithEmployee
	newEmployeeId: string
	show: boolean
}

const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
	WINDOWS: 'Windows',
	LINUX: 'Linux'
}

// component
export function DeviceAssignmentWizard({
	open,
	onClose,
	departmentId,
	employees,
	devices,
	onDevicesRefresh,
	onEmployeesRefresh
}: DeviceAssignmentWizardProps) {
	const t = useTranslations('dashboard.departments.deviceAssignmentWizard')
	const queryClient = useQueryClient()
	const [step, setStep] = useState(1)
	const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
	const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(
		new Set()
	)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isRegistering, setIsRegistering] = useState(false)
	const [showRegistrationForm, setShowRegistrationForm] = useState(false)
	const [reassignmentConfirmation, setReassignmentConfirmation] =
		useState<ReassignmentConfirmation>({
			device: {} as DeviceWithEmployee,
			newEmployeeId: '',
			show: false
		})
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

	const devicesWithEmployees = useMemo(() => {
		return devices.map(device => ({
			...device,
			employee: device.employeeId
				? employeeMap.get(device.employeeId)
				: undefined
		})) as DeviceWithEmployee[]
	}, [devices, employeeMap])

	const departmentDevices = useMemo(
		() =>
			devicesWithEmployees.filter(
				device => device.departmentId === departmentId
			),
		[devicesWithEmployees, departmentId]
	)

	const unassignedDevices = useMemo(
		() => devicesWithEmployees.filter(device => !device.departmentId),
		[devicesWithEmployees]
	)

	const resetState = () => {
		setStep(1)
		setSelectedEmployeeId('')
		setSelectedDeviceIds(new Set())
		setShowRegistrationForm(false)
		setReassignmentConfirmation({
			device: {} as DeviceWithEmployee,
			newEmployeeId: '',
			show: false
		})
		setNewDeviceData({
			name: '',
			ipAddress: '',
			agentKey: '',
			type: DeviceType.WINDOWS
		})
	}

	const handleDeviceToggle = (deviceId: string) => {
		const device = devicesWithEmployees.find(d => d.id === deviceId)
		if (!device) return

		const newSelectedDeviceIds = new Set(selectedDeviceIds)

		if (newSelectedDeviceIds.has(deviceId)) {
			newSelectedDeviceIds.delete(deviceId)
			setSelectedDeviceIds(newSelectedDeviceIds)
		} else {
			// confirmation required when reassigning to another employee
			if (device.employeeId && device.employeeId !== selectedEmployeeId) {
				setReassignmentConfirmation({
					device,
					newEmployeeId: selectedEmployeeId,
					show: true
				})
			} else {
				newSelectedDeviceIds.add(deviceId)
				setSelectedDeviceIds(newSelectedDeviceIds)
			}
		}
	}

	// handleSubmit fix
	const handleSubmit = async () => {
		if (!selectedEmployeeId || selectedDeviceIds.size === 0) return

		setIsSubmitting(true)
		try {
			await assignDevicesToEmployee({
				departmentId,
				employeeId: selectedEmployeeId,
				deviceIds: Array.from(selectedDeviceIds)
			})

			await queryClient.invalidateQueries({
				queryKey: [EMPLOYEES_QUERY_KEY]
			})
			await queryClient.invalidateQueries({
				queryKey: [DEPARTMENTS_QUERY_KEY]
			})

			await onDevicesRefresh?.()
			await onEmployeesRefresh?.()

			toast.success(t('assignmentSuccess'))
			onClose()
			resetState()
		} catch (error) {
			console.error('Ошибка при назначении устройств:', error)
			toast.error(t('assignmentError'))
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleRegisterDevice = async () => {
		if (
			!newDeviceData.name ||
			!newDeviceData.ipAddress ||
			!newDeviceData.agentKey
		) {
			toast.error(t('fillAllFields'))
			return
		}

		setIsRegistering(true)
		try {
			await createDevice({
				...newDeviceData,
				departmentId
			})

			await queryClient.invalidateQueries({
				queryKey: [DEPARTMENTS_QUERY_KEY]
			})
			await onDevicesRefresh?.()

			toast.success(t('deviceRegistrationSuccess'))
			setShowRegistrationForm(false)
			setNewDeviceData({
				name: '',
				ipAddress: '',
				agentKey: '',
				type: DeviceType.WINDOWS
			})
		} catch (error) {
			console.error('Ошибка при регистрации устройства:', error)
			toast.error(t('deviceRegistrationError'))
		} finally {
			setIsRegistering(false)
		}
	}

	const handleConfirmReassignment = () => {
		const newSelectedDeviceIds = new Set(selectedDeviceIds)
		newSelectedDeviceIds.add(reassignmentConfirmation.device.id)
		setSelectedDeviceIds(newSelectedDeviceIds)
		setReassignmentConfirmation(prev => ({ ...prev, show: false }))
	}

	const handleCancelReassignment = () => {
		setReassignmentConfirmation(prev => ({ ...prev, show: false }))
	}

	return (
		<Dialog open={open} onOpenChange={open => !open && onClose()}>
			<DialogContent>
				{step === 1 && (
					<>
						<DialogHeader>
							<DialogTitle>{t('title')}</DialogTitle>
							<DialogDescription>
								{t('step1Description', { step, total: 2 })}
							</DialogDescription>
						</DialogHeader>

						<div className='space-y-4'>
							<div>
								<Label htmlFor='employee-select'>
									{t('selectEmployee')}
								</Label>
								<Select
									value={selectedEmployeeId}
									onValueChange={setSelectedEmployeeId}
								>
									<SelectTrigger>
										<SelectValue
											placeholder={t(
												'selectEmployeePlaceholder'
											)}
										/>
									</SelectTrigger>
									<SelectContent>
										{employees.map(employee => (
											<SelectItem
												key={employee.id}
												value={employee.id}
											>
												{employee.firstName}{' '}
												{employee.lastName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<DialogFooter>
							<Button variant='outline' onClick={onClose}>
								{t('cancel')}
							</Button>
							<Button
								onClick={() => setStep(2)}
								disabled={!selectedEmployeeId}
							>
								{t('next')}
							</Button>
						</DialogFooter>
					</>
				)}

				{step === 2 && (
					<>
						<DialogHeader>
							<DialogTitle>{t('title')}</DialogTitle>
							<DialogDescription>
								{t('step2Description', { step, total: 2 })}
							</DialogDescription>
						</DialogHeader>

						<div className='space-y-4'>
							{/* удалён некорректный комментарий */}
							<div className='flex items-center justify-between'>
								<h3 className='text-lg font-medium'>
									{t('departmentDevices')}
								</h3>
								<Button
									variant='outline'
									onClick={() =>
										setShowRegistrationForm(true)
									}
								>
									<Plus className='mr-2 h-4 w-4' />
									{t('registerNew')}
								</Button>
							</div>

							<ScrollArea className='h-48 rounded-md border p-4'>
								{departmentDevices.length === 0 ? (
									<p className='py-8 text-center text-muted-foreground'>
										{t('noDevicesInDepartment')}
									</p>
								) : (
									<div className='space-y-2'>
										{departmentDevices.map(device => {
											const isAssigned =
												!!device.employeeId
											const isDifferentEmployee =
												isAssigned &&
												device.employeeId !==
													selectedEmployeeId

											return (
												<div
													key={device.id}
													className={cn(
														'flex items-center space-x-2 rounded-md p-2 transition-colors',
														isAssigned &&
															'border border-yellow-200 bg-yellow-50',
														isDifferentEmployee &&
															'border border-orange-200 bg-orange-50'
													)}
												>
													<Checkbox
														id={device.id}
														checked={selectedDeviceIds.has(
															device.id
														)}
														onCheckedChange={() =>
															handleDeviceToggle(
																device.id
															)
														}
													/>
													<Label
														htmlFor={device.id}
														className='flex-1 cursor-pointer'
													>
														<div className='flex items-center justify-between'>
															<div>
																<span className='font-medium'>
																	{
																		device.name
																	}
																</span>
																<span className='ml-2 text-sm text-muted-foreground'>
																	{
																		device.ipAddress
																	}
																</span>
																{isAssigned &&
																	device.employee && (
																		<div className='mt-1 text-xs text-muted-foreground'>
																			{t(
																				'assignedTo'
																			)}
																			:{' '}
																			{
																				device
																					.employee
																					.firstName
																			}{' '}
																			{
																				device
																					.employee
																					.lastName
																			}
																			{device
																				.employee
																				.department &&
																				device
																					.employee
																					.department
																					.name !==
																					employees.find(
																						e =>
																							e.id ===
																							selectedEmployeeId
																					)
																						?.department
																						?.name && (
																					<span className='ml-1 text-orange-600'>
																						(
																						{
																							device
																								.employee
																								.department
																								.name
																						}
																						)
																					</span>
																				)}
																		</div>
																	)}
															</div>
															<div className='flex items-center space-x-2'>
																<Badge variant='secondary'>
																	{
																		DEVICE_TYPE_LABEL[
																			device
																				.type
																		]
																	}
																</Badge>
																{isAssigned && (
																	<Badge
																		variant={
																			isDifferentEmployee
																				? 'destructive'
																				: 'outline'
																		}
																		className={
																			isDifferentEmployee
																				? 'border-orange-300 bg-orange-100 text-orange-800'
																				: ''
																		}
																	>
																		{isDifferentEmployee
																			? t(
																					'assignedToOther'
																				)
																			: t(
																					'alreadyAssigned'
																				)}
																	</Badge>
																)}
															</div>
														</div>
													</Label>
												</div>
											)
										})}
									</div>
								)}
							</ScrollArea>

							<Separator />

							<div>
								<h3 className='mb-4 text-lg font-medium'>
									{t('unassignedDevices')}
								</h3>
								<ScrollArea className='h-48 rounded-md border p-4'>
									{unassignedDevices.length === 0 ? (
										<p className='py-8 text-center text-muted-foreground'>
											{t('noUnassignedDevices')}
										</p>
									) : (
										<div className='space-y-2'>
											{unassignedDevices.map(device => (
												<div
													key={device.id}
													className='flex items-center space-x-2'
												>
													<Checkbox
														id={`unassigned-${device.id}`}
														checked={selectedDeviceIds.has(
															device.id
														)}
														onCheckedChange={() =>
															handleDeviceToggle(
																device.id
															)
														}
													/>
													<Label
														htmlFor={`unassigned-${device.id}`}
														className='flex-1 cursor-pointer'
													>
														<div className='flex items-center justify-between'>
															<div>
																<span className='font-medium'>
																	{
																		device.name
																	}
																</span>
																<span className='ml-2 text-sm text-muted-foreground'>
																	{
																		device.ipAddress
																	}
																</span>
															</div>
															<Badge variant='secondary'>
																{
																	DEVICE_TYPE_LABEL[
																		device
																			.type
																	]
																}
															</Badge>
														</div>
													</Label>
												</div>
											))}
										</div>
									)}
								</ScrollArea>
							</div>
						</div>

						<DialogFooter>
							<Button
								variant='outline'
								onClick={() => setStep(1)}
							>
								{t('back')}
							</Button>
							<Button variant='outline' onClick={onClose}>
								{t('cancel')}
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={
									selectedDeviceIds.size === 0 || isSubmitting
								}
							>
								{isSubmitting && (
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								)}
								{t('assignDevices')}
							</Button>
						</DialogFooter>
					</>
				)}

				{showRegistrationForm && (
					<Dialog
						open={showRegistrationForm}
						onOpenChange={setShowRegistrationForm}
					>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									{t('deviceRegistration')}
								</DialogTitle>
								<DialogDescription>
									{t('deviceRegistrationDescription')}
								</DialogDescription>
							</DialogHeader>

							<div className='space-y-4'>
								<div>
									<Label htmlFor='device-name'>
										{t('deviceName')}
									</Label>
									<Input
										id='device-name'
										value={newDeviceData.name}
										onChange={e =>
											setNewDeviceData(prev => ({
												...prev,
												name: e.target.value
											}))
										}
										placeholder={t('deviceNamePlaceholder')}
									/>
								</div>

								<div>
									<Label htmlFor='device-ip'>
										{t('ipAddress')}
									</Label>
									<Input
										id='device-ip'
										value={newDeviceData.ipAddress}
										onChange={e =>
											setNewDeviceData(prev => ({
												...prev,
												ipAddress: e.target.value
											}))
										}
										placeholder='192.168.1.100'
									/>
								</div>

								<div>
									<Label htmlFor='device-key'>
										{t('agentKey')}
									</Label>
									<Input
										id='device-key'
										value={newDeviceData.agentKey}
										onChange={e =>
											setNewDeviceData(prev => ({
												...prev,
												agentKey: e.target.value
											}))
										}
										placeholder={t('agentKeyPlaceholder')}
									/>
								</div>

								<div>
									<Label htmlFor='device-type'>
										{t('deviceType')}
									</Label>
									<Select
										value={newDeviceData.type}
										onValueChange={(value: DeviceType) =>
											setNewDeviceData(prev => ({
												...prev,
												type: value
											}))
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem
												value={DeviceType.WINDOWS}
											>
												Windows
											</SelectItem>
											<SelectItem
												value={DeviceType.LINUX}
											>
												Linux
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<DialogFooter>
								<Button
									variant='outline'
									onClick={() =>
										setShowRegistrationForm(false)
									}
								>
									{t('cancel')}
								</Button>
								<Button
									onClick={handleRegisterDevice}
									disabled={isRegistering}
								>
									{isRegistering && (
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									)}
									{t('register')}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				)}

				{/* Reassignment confirmation dialog */}
				<AlertDialog
					open={reassignmentConfirmation.show}
					onOpenChange={open => !open && handleCancelReassignment()}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle className='flex items-center gap-2'>
								<AlertTriangle className='h-5 w-5 text-orange-500' />
								{t('confirmReassignment')}
							</AlertDialogTitle>
							<AlertDialogDescription className='space-y-2'>
								<p>{t('reassignmentWarning')}</p>
								<div className='rounded-md border border-orange-200 bg-orange-50 p-3'>
									<p className='text-sm font-medium'>
										{t('deviceInfo')}:{' '}
										<span className='font-normal'>
											{
												reassignmentConfirmation.device
													.name
											}
										</span>
									</p>
									{reassignmentConfirmation.device
										.employee && (
										<p className='text-sm text-muted-foreground'>
											{t('currentlyAssignedTo')}:{' '}
											{
												reassignmentConfirmation.device
													.employee.firstName
											}{' '}
											{
												reassignmentConfirmation.device
													.employee.lastName
											}
											{reassignmentConfirmation.device
												.employee.department && (
												<span className='ml-1 text-orange-600'>
													(
													{
														reassignmentConfirmation
															.device.employee
															.department.name
													}
													)
												</span>
											)}
										</p>
									)}
									<p className='text-sm text-muted-foreground'>
										{t('willBeReassignedTo')}:{' '}
										{
											employees.find(
												e =>
													e.id ===
													reassignmentConfirmation.newEmployeeId
											)?.firstName
										}{' '}
										{
											employees.find(
												e =>
													e.id ===
													reassignmentConfirmation.newEmployeeId
											)?.lastName
										}
									</p>
								</div>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel
								onClick={handleCancelReassignment}
							>
								{t('cancel')}
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleConfirmReassignment}
								className='bg-orange-600 hover:bg-orange-700'
							>
								{t('confirmReassignmentAction')}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</DialogContent>
		</Dialog>
	)
}
