'use client'

import { Device, Employee } from '@prisma/client'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { updateEmployeeDevicesSelection } from '@/app/actions/device'
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
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scrollarea'
import { EMPLOYEES_QUERY_KEY } from '@/hooks/useEmployee'
import { useEmployeeDevices } from '@/hooks/useEmployeeDevices'

interface ManageDevicesModalProps {
	isOpen: boolean
	onClose: () => void
	employee: Employee & {
		devices?: Device[]
	}
}

export function ManageDevicesModal({
	isOpen,
	onClose,
	employee
}: ManageDevicesModalProps) {
	const t = useTranslations('dashboard.employees.modal.devices')
	const tStatus = useTranslations(
		'dashboard.departments.deviceAssignmentWizard.deviceStatus'
	)
	const tConfirm = useTranslations(
		'dashboard.departments.deviceAssignmentWizard.confirmReassignment'
	)
	const queryClient = useQueryClient()
	const { devices: allDevices, isLoading, refetch } = useEmployeeDevices()

	const [selectedDevices, setSelectedDevices] = useState<Set<string>>(
		new Set(employee.devices?.map(device => device.id) || [])
	)
	const [isSubmitting, setIsSubmitting] = useState(false)

	// Диалог подтверждения перепривязки: расширяем тип, чтобы принять устройства с дополнительными полями (например, status)
	type AnyDevice = Device & { employeeId?: string | null } & Record<
			string,
			unknown
		>
	const [reassignmentConfirmation, setReassignmentConfirmation] = useState<{
		device: AnyDevice | null
		show: boolean
	}>({ device: null, show: false })

	const handleToggleDevice = (deviceId: string) => {
		const device = allDevices?.find(d => d.id === deviceId) as
			| AnyDevice
			| undefined
		if (!device) return

		const next = new Set(selectedDevices)
		const isSelected = next.has(deviceId)

		if (isSelected) {
			next.delete(deviceId)
			setSelectedDevices(next)
			return
		}

		// Если устройство уже назначено другому сотруднику — показываем подтверждение
		if (device.employeeId && device.employeeId !== employee.id) {
			setReassignmentConfirmation({ device, show: true })
			return
		}

		next.add(deviceId)
		setSelectedDevices(next)
	}

	const confirmReassignment = () => {
		if (!reassignmentConfirmation.device) return
		const next = new Set(selectedDevices)
		next.add(reassignmentConfirmation.device.id)
		setSelectedDevices(next)
		setReassignmentConfirmation({ device: null, show: false })
	}

	const cancelReassignment = () => {
		setReassignmentConfirmation({ device: null, show: false })
	}

	useEffect(() => {
		if (isOpen) {
			refetch()
		}
	}, [isOpen, refetch])

	const handleSubmit = async () => {
		try {
			setIsSubmitting(true)

			// Эксклюзивная синхронизация: назначить выбранные, снять остальные у этого сотрудника
			const result = await updateEmployeeDevicesSelection({
				employeeId: employee.id,
				departmentId: employee.departmentId || '',
				deviceIds: Array.from(selectedDevices)
			})

			if (!result.success) {
				throw new Error(result.error || 'Failed to update devices')
			}

			queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
			toast.success(t('success'))
			onClose()
		} catch (error) {
			console.error('Ошибка при обновлении устройств:', error)
			toast.error(t('error'))
		} finally {
			setIsSubmitting(false)
		}
	}

	const toggleAllDevices = (checked: boolean) => {
		if (checked) {
			setSelectedDevices(
				new Set(allDevices?.map(device => device.id) || [])
			)
		} else {
			setSelectedDevices(new Set())
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>{t('heading')}</DialogTitle>
				</DialogHeader>

				<ScrollArea className='h-[400px] pr-4'>
					<div className='space-y-4'>
						{isLoading ? (
							<div className='flex items-center justify-center p-4'>
								<Loader2 className='h-6 w-6 animate-spin' />
								<span className='ml-2'>{t('loading')}</span>
							</div>
						) : !allDevices || allDevices.length === 0 ? (
							<div className='py-8 text-center text-muted-foreground'>
								<p>{t('noDevices')}</p>
							</div>
						) : (
							<>
								<div className='flex items-start space-x-3 border-b pb-4'>
									<Checkbox
										id='select-all'
										checked={
											allDevices?.length > 0 &&
											selectedDevices.size ===
												allDevices?.length
										}
										onCheckedChange={toggleAllDevices}
									/>
									<label
										htmlFor='select-all'
										className='cursor-pointer text-sm font-medium leading-none'
									>
										{selectedDevices.size > 0
											? t('unselectAll')
											: t('selectAll')}
									</label>
								</div>
								<div className='space-y-4 pt-2'>
									{allDevices?.map(device => {
										const isAssigned = !!device.employeeId
										const isAssignedToOther =
											isAssigned &&
											device.employeeId !== employee.id

										return (
											<div
												key={device.id}
												className='flex items-start space-x-3'
											>
												<Checkbox
													id={device.id}
													checked={selectedDevices.has(
														device.id
													)}
													onCheckedChange={() =>
														handleToggleDevice(
															device.id
														)
													}
												/>
												<div className='flex-1 space-y-1'>
													<label
														htmlFor={device.id}
														className='cursor-pointer text-sm font-medium leading-none'
													>
														{device.name}
													</label>
													<div className='flex items-center justify-between'>
														<p className='text-xs text-muted-foreground'>
															{device.ipAddress}
														</p>
														{isAssigned && (
															<span
																className={
																	isAssignedToOther
																		? 'rounded-full border border-orange-300 bg-orange-100 px-2 py-0.5 text-[10px] text-orange-800'
																		: 'rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground'
																}
															>
																{tStatus(
																	'alreadyAssigned'
																)}
															</span>
														)}
													</div>
												</div>
											</div>
										)
									})}
								</div>
							</>
						)}
					</div>
				</ScrollArea>

				<div className='mt-6 flex justify-end space-x-2'>
					<Button
						variant='outline'
						onClick={onClose}
						disabled={isSubmitting}
					>
						{t('cancel')}
					</Button>
					<Button onClick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? t('submitting') : t('submit')}
					</Button>
				</div>

				{/* Диалог подтверждения перепривязки */}
				<AlertDialog
					open={reassignmentConfirmation.show}
					onOpenChange={open => !open && cancelReassignment()}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle className='flex items-center gap-2'>
								<AlertTriangle className='h-5 w-5 text-orange-500' />
								{tConfirm('title')}
							</AlertDialogTitle>
							{/* ВАЖНО: меняем рутовый элемент на div, чтобы избежать <p> внутри <p> */}
							<AlertDialogDescription asChild>
								<div className='space-y-2 text-sm text-muted-foreground'>
									<div className='rounded-md border border-orange-200 bg-orange-50 p-3'>
										<div>
											{tConfirm('question', {
												deviceName:
													reassignmentConfirmation
														.device?.name ?? '',
												newEmployee: `${employee.firstName} ${employee.lastName}`
											})}
										</div>
									</div>
								</div>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel onClick={cancelReassignment}>
								{tConfirm('cancel')}
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={confirmReassignment}
								className='bg-orange-600 hover:bg-orange-700'
							>
								{tConfirm('confirm')}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</DialogContent>
		</Dialog>
	)
}
