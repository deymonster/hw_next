'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
	Building2,
	FileText,
	Monitor,
	Pencil,
	Trash,
	Users
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

import { ManageDepartmentDevicesModal } from '../device/ManageDepartmentDevicesModal'
import { EditDepartmentModal } from '../edit/forms/EditModal'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/elements/ConfirmModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DepartmentWithCounts } from '@/hooks/useDepartment'
import { useDepartment } from '@/hooks/useDepartment'

interface DepartmentDetailProps {
	department: DepartmentWithCounts
	onBack: () => void
}

export function DepartmentDetail({
	department,
	onBack
}: DepartmentDetailProps) {
	const t = useTranslations('dashboard.departments')
	const { deleteDepartment } = useDepartment()
	const [isDeleting, setIsDeleting] = useState(false)
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const [isDevicesModalOpen, setIsDevicesModalOpen] = useState(false)
	const queryClient = useQueryClient()

	const handleDelete = async () => {
		try {
			setIsDeleting(true)
			// Оптимистичное обновление UI
			queryClient.setQueryData(
				['departments'],
				(old: DepartmentWithCounts[] | undefined) =>
					old ? old.filter(dep => dep.id !== department.id) : []
			)

			await deleteDepartment(department.id)
			toast.success('Отдел успешно удален')
			onBack()
		} catch (error) {
			// В случае ошибки инвалидируем кэш для получения актуальных данных
			console.error(error)
			queryClient.invalidateQueries({ queryKey: ['departments'] })
			toast.error('Ошибка при удалении отдела')
		} finally {
			setIsDeleting(false)
		}
	}

	return (
		<div className='mt-6 space-y-6'>
			<div className='flex items-center justify-between'>
				<div>
					<h2 className='text-2xl font-bold'>{department.name}</h2>
					<p className='text-sm text-muted-foreground'>
						{department.description || 'Нет описания'}
					</p>
				</div>

				<div className='flex items-center space-x-2'>
					<Button
						variant='outline'
						size='icon'
						onClick={() => setIsEditModalOpen(true)}
					>
						<Pencil className='h-4 w-4' />
					</Button>
					<ConfirmModal
						heading='Удаление отдела'
						message={`Вы действительно хотите удалить отдел "${department.name}"? Это действие нельзя отменить.`}
						onConfirm={handleDelete}
					>
						<Button
							variant='destructive'
							size='icon'
							disabled={isDeleting}
						>
							<Trash className='h-4 w-4' />
						</Button>
					</ConfirmModal>
				</div>
			</div>
			<EditDepartmentModal
				isOpen={isEditModalOpen}
				onClose={() => setIsEditModalOpen(false)}
				department={department}
			/>

			<Tabs defaultValue='info'>
				<TabsList className='grid w-full grid-cols-3'>
					<TabsTrigger value='info'>{t('detail.info')}</TabsTrigger>
					<TabsTrigger value='employees'>
						{t('detail.employees')}
					</TabsTrigger>
					<TabsTrigger value='devices'>Устройства</TabsTrigger>
				</TabsList>

				<TabsContent value='info'>
					<Card>
						<CardContent className='pt-6'>
							<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<Building2 className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('detail.departmentName')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{department.name}
									</p>
								</div>

								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<FileText className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('detail.departmentDescription')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{department.description ||
											t('detail.noDepartmentDescription')}
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
										{department.deviceCount}
									</p>
								</div>

								<div className='rounded-lg bg-secondary/20 p-4'>
									<div className='mb-2 flex items-center space-x-2'>
										<Users className='h-4 w-4 text-muted-foreground' />
										<h3 className='font-medium'>
											{t('detail.employeeCount')}
										</h3>
									</div>
									<p className='pl-6 text-sm text-muted-foreground'>
										{department.employeesCount}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value='employees'>
					<Card>
						<CardContent className='pt-6'>
							{department.employees &&
							department.employees.length > 0 ? (
								<div className='space-y-4'>
									<div className='grid grid-cols-3 gap-4 border-b pb-2 text-sm font-medium text-muted-foreground'>
										<div>{t('detail.fullName')}</div>
										<div>{t('detail.position')}</div>
										<div>{t('detail.contacts')}</div>
									</div>
									{department.employees.map(employee => (
										<div
											key={employee.id}
											className='grid grid-cols-3 gap-4 text-sm'
										>
											<div className='flex items-center space-x-2'>
												<Users className='h-4 w-4 text-muted-foreground' />
												<span>{`${employee.lastName} ${employee.firstName}`}</span>
											</div>
											<div>{employee.position}</div>
											<div className='space-y-1'>
												{employee.email && (
													<div className='text-muted-foreground'>
														{employee.email}
													</div>
												)}
												{employee.phone && (
													<div className='text-muted-foreground'>
														{employee.phone}
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							) : (
								<div className='py-8 text-center text-muted-foreground'>
									<Users className='mx-auto mb-2 h-8 w-8' />
									<p>{t('detail.noEmployee')}</p>
								</div>
							)}
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
								{!department.devices ||
								department.devices.length === 0 ? (
									<div className='py-8 text-center text-muted-foreground'>
										<Monitor className='mx-auto mb-2 h-8 w-8' />
										<p>{t('detail.noDevices')}</p>
									</div>
								) : (
									department.devices.map(device => (
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
																className={`h-2 w-2 rounded-full ${device.deviceStatus?.isOnline ? 'bg-green-500' : 'bg-red-500'}`}
																title={
																	device
																		.deviceStatus
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
														{device.deviceStatus
															?.lastSeen
															? new Date(
																	device.deviceStatus.lastSeen
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
							<ManageDepartmentDevicesModal
								isOpen={isDevicesModalOpen}
								onClose={() => setIsDevicesModalOpen(false)}
								department={department}
							/>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	)
}
