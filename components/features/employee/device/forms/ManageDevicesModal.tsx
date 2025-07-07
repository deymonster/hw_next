'use client'

import { Device, Employee } from '@prisma/client'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scrollarea'
import { useEmployees } from '@/hooks/useEmployee'
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
	const queryClient = useQueryClient()
	const { updateEmployee } = useEmployees()
	const { devices: allDevices, isLoading, refetch } = useEmployeeDevices()

	const [selectedDevices, setSelectedDevices] = useState<Set<string>>(
		new Set(employee.devices?.map(device => device.id) || [])
	)
	const [isSubmitting, setIsSubmitting] = useState(false)

	useEffect(() => {
		if (isOpen) {
			refetch()
		}
	}, [isOpen, refetch])

	const handleSubmit = async () => {
		try {
			setIsSubmitting(true)
			await updateEmployee({
				id: employee.id,
				data: {
					devices: {
						set: Array.from(selectedDevices).map(id => ({ id }))
					}
				}
			})

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

	const toggleDevice = (deviceId: string) => {
		setSelectedDevices(prev => {
			const next = new Set(prev)
			if (next.has(deviceId)) {
				next.delete(deviceId)
			} else {
				next.add(deviceId)
			}
			return next
		})
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
									{allDevices.map(device => (
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
													toggleDevice(device.id)
												}
											/>
											<div className='space-y-1'>
												<label
													htmlFor={device.id}
													className='cursor-pointer text-sm font-medium leading-none'
												>
													{device.name}
												</label>
												<p className='text-xs text-muted-foreground'>
													{device.ipAddress}
												</p>
											</div>
										</div>
									))}
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
			</DialogContent>
		</Dialog>
	)
}
