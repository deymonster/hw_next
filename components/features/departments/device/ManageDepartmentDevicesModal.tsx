'use client'

import { Device } from '@prisma/client'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { updateDepartmentDevices } from '@/app/actions/device'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scrollarea'
import {
	DEPARTMENTS_QUERY_KEY,
	DepartmentWithCounts
} from '@/hooks/useDepartment'
import { useDepartmentDevices } from '@/hooks/useDepartmentDevices'

interface ManageDepartmentDevicesModalProps {
	isOpen: boolean
	onClose: () => void
	department: DepartmentWithCounts
}

export function ManageDepartmentDevicesModal({
	isOpen,
	onClose,
	department
}: ManageDepartmentDevicesModalProps) {
	const t = useTranslations('dashboard.departments.modal.devices')
	const queryClient = useQueryClient()
	const { devices: allDevices, isLoading, refetch } = useDepartmentDevices()

	const [selectedDevices, setSelectedDevices] = useState<Set<string>>(
		new Set(department.devices?.map(device => device.id) || [])
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
			await updateDepartmentDevices({
				id: department.id,
				deviceIds: Array.from(selectedDevices)
			})
			queryClient.setQueryData(
				DEPARTMENTS_QUERY_KEY,
				(oldData: DepartmentWithCounts[] | undefined) => {
					if (!oldData) return []
					return oldData.map(dep => {
						if (dep.id === department.id) {
							return {
								...dep,
								devices: Array.from(selectedDevices)
									.map(id =>
										allDevices?.find(
											device => device.id === id
										)
									)
									.filter(Boolean) as Device[],
								deviceCount: selectedDevices.size
							}
						}
						return dep
					})
				}
			)

			queryClient.invalidateQueries({ queryKey: DEPARTMENTS_QUERY_KEY })
			queryClient.invalidateQueries({ queryKey: ['department-devices'] })
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
