'use client'

import { Department, Device, DeviceStatus, Employee } from '@prisma/client'
import { useQueryClient } from '@tanstack/react-query'
import {
	Briefcase,
	Building2,
	Mail,
	Monitor,
	Phone,
	Trash2,
	User2
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

import { ManageDevicesModal } from '../device/forms/ManageDevicesModal'
import { EditEmployeeModal } from '../edit/forms/EditModal'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/elements/ConfirmModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEmployees } from '@/hooks/useEmployee'

type EmployeeWithRelations = Employee & {
	department?: Department | null
	devices?: (Device & {
		status?: {
			isOnline: boolean
			lastSeen: Date | null
			deviceStatus: DeviceStatus
		}
	})[]
}

interface EmployeeDetailProps {
	employee: EmployeeWithRelations
	onBack: () => void
}

export function EmployeeDetail({ employee, onBack }: EmployeeDetailProps) {
	const t = useTranslations('dashboard.employees')
	const { deleteEmployee } = useEmployees()
	const [isDeleting, setIsDeleting] = useState(false)
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const [isDevicesModalOpen, setIsDevicesModalOpen] = useState(false)
	const queryClient = useQueryClient()

	const handleDelete = async () => {
		try {
			setIsDeleting(true)
			queryClient.setQueryData(
				['employees'],
				(old: EmployeeWithRelations[] | undefined) =>
					old ? old.filter(emp => emp.id !== employee.id) : []
			)

			await deleteEmployee({
				id: employee.id,
				unassignDevices: true
			})
			toast.success('Сотрудник успешно удален')
			onBack()
		} catch (error) {
			console.error(error)
			queryClient.invalidateQueries({ queryKey: ['employees'] })
			toast.error('Ошибка при удалении сотрудника')
		} finally {
			setIsDeleting(false)
		}
	}

	return (
		<div className='mt-6 space-y-6'>
			<div className='flex items-center justify-between'>
				<div>
					<h2 className='text-2xl font-bold'>{`${employee.firstName} ${employee.lastName}`}</h2>
					<p className='text-sm text-muted-foreground'>
						{employee.position}
					</p>
				</div>

				<div className='flex items-center space-x-2'>
					<Button
						variant='outline'
						size='icon'
						onClick={() => setIsEditModalOpen(true)}
					>
						<User2 className='h-4 w-4' />
					</Button>

					<ConfirmModal
						heading={t('modal.delete.confirmTitle')}
						message={t('modal.delete.confirmMessage', {
							name: `${employee.firstName} ${employee.lastName}`
						})}
						onConfirm={handleDelete}
					>
						<Button
							variant='destructive'
							size='icon'
							disabled={isDeleting}
						>
							<Trash2 className='h-4 w-4' />
						</Button>
					</ConfirmModal>
				</div>
			</div>

			<EditEmployeeModal
				isOpen={isEditModalOpen}
				onClose={() => setIsEditModalOpen(false)}
				employee={employee}
			/>

			<Tabs defaultValue='info'>
				<TabsList className='grid w-full grid-cols-2'>
					<TabsTrigger value='info'>{t('detail.info')}</TabsTrigger>
					<TabsTrigger value='devices'>
						{t('detail.devices')}
					</TabsTrigger>
				</TabsList>

				<TabsContent value='info'>
					<Card>
						<CardContent className='pt-6'>
							<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<User2 className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('detail.fullName')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{`${employee.firstName} ${employee.lastName}`}
									</p>
								</div>

								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<Building2 className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('detail.department')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{employee.department?.name ||
											t('detail.departmentNotSet')}
									</p>
								</div>

								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<Mail className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('detail.email')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{employee.email}
									</p>
								</div>

								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<Phone className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('detail.phone')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{employee.phone ||
											t('detail.phoneNotSet')}
									</p>
								</div>

								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<Briefcase className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('detail.position')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{employee.position}
									</p>
								</div>

								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<Monitor className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('detail.deviceCount')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{employee.devices?.length || 0}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value='devices'>
					<Card>
						<CardContent className='pt-6'>
							<div className='mb-4 flex items-center justify-between'>
								<h3 className='text-lg font-medium'>
									{t('detail.assignedDevices')}
								</h3>
								<Button
									onClick={() => setIsDevicesModalOpen(true)}
								>
									<Monitor className='mr-2 h-4 w-4' />
									{t('detail.manageDevices')}
								</Button>
							</div>

							<div className='space-y-4'>
								{!employee.devices ||
								employee.devices.length === 0 ? (
									<div className='py-8 text-center text-muted-foreground'>
										<p>{t('detail.noDevices')}</p>
									</div>
								) : (
									employee.devices.map(device => (
										<div
											key={device.id}
											className='rounded-lg bg-secondary/20 p-4 transition-colors hover:bg-secondary/30'
										>
											<div className='flex items-start space-x-4'>
												<div className='rounded-full bg-primary/10 p-2'>
													<Monitor className='h-5 w-5 text-primary' />
												</div>
												<div className='flex-1'>
													<div className='flex items-center justify-between'>
														<h3 className='text-sm font-medium'>
															{device.name}
														</h3>
														<div className='flex items-center space-x-2'>
															<span className='rounded-full bg-secondary px-2 py-1 text-xs'>
																{
																	device.ipAddress
																}
															</span>
															<div
																className={`h-2 w-2 rounded-full ${device.status?.isOnline ? 'bg-green-500' : 'bg-red-500'}`}
																title={
																	device
																		.status
																		?.isOnline
																		? t(
																				'detail.online'
																			)
																		: t(
																				'detail.offline'
																			)
																}
															/>
														</div>
													</div>
													<p className='mt-1 text-xs text-muted-foreground'>
														{t(
															'detail.lastActivity'
														)}
														:{' '}
														{device.status?.lastSeen
															? new Date(
																	device.status.lastSeen
																).toLocaleString()
															: t(
																	'detail.noData'
																)}
													</p>
												</div>
											</div>
										</div>
									))
								)}
							</div>
							<ManageDevicesModal
								isOpen={isDevicesModalOpen}
								onClose={() => setIsDevicesModalOpen(false)}
								employee={employee}
							/>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	)
}
