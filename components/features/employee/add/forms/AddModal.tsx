'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { ModalForm } from '@/components/ui/elements/ModalForm'
import { useDepartment } from '@/hooks/useDepartment'
import { useEmployees } from '@/hooks/useEmployee'

interface AddEmployeeModalProps {
	isOpen: boolean
	onClose: () => void
}

interface AddEmployeeForm extends Record<string, unknown> {
	firstName: string
	lastName: string
	email: string
	phone: string
	departmentId: string
	position: string
}

export function AddEmployeeModal({ isOpen, onClose }: AddEmployeeModalProps) {
	const t = useTranslations('dashboard.employees.modal.add')
	const queryClient = useQueryClient()
	const { createEmployee } = useEmployees()
	const { departments } = useDepartment()

	const handleSubmit = async (data: AddEmployeeForm) => {
		try {
			await createEmployee(data)
			queryClient.invalidateQueries({ queryKey: ['employees'] })
			toast.success(t('success'))
			onClose()
		} catch (error) {
			console.error(error)
			toast.error(t('error'))
		}
	}

	return (
		<ModalForm<AddEmployeeForm>
			isOpen={isOpen}
			onClose={onClose}
			title={t('heading')}
			fields={[
				{
					name: 'firstName',
					label: t('nameLabel'),
					placeholder: t('namePlaceholder'),
					required: true
				},
				{
					name: 'lastName',
					label: t('lastNameLabel'),
					placeholder: t('lastNamePlaceholder'),
					required: true
				},
				{
					name: 'email',
					label: t('emailLabel'),
					placeholder: t('emailPlaceholder'),
					type: 'email',
					required: true
				},
				{
					name: 'phone',
					label: t('phoneLabel'),
					placeholder: t('phonePlaceholder'),
					type: 'tel'
				},
				{
					name: 'departmentId',
					label: t('departmentLabel'),
					type: 'select',
					options:
						departments?.map(dept => ({
							value: dept.id,
							label: dept.name
						})) || [],
					placeholder: t('departmentPlaceholder')
				},
				{
					name: 'position',
					label: t('positionLabel'),
					placeholder: t('positionPlaceholder'),
					required: true
				}
			]}
			onSubmit={handleSubmit}
			submitText={t('submitButton')}
			submittingText={t('submitting')}
		/>
	)
}
