'use client'

import { Department, Employee } from '@prisma/client'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { ModalForm } from '@/components/ui/elements/ModalForm'
import { useDepartment } from '@/hooks/useDepartment'
import { EMPLOYEES_QUERY_KEY, useEmployees } from '@/hooks/useEmployee'

interface EditEmployeeModalProps {
	isOpen: boolean
	onClose: () => void
	employee: Employee & {
		department?: Department | null
	}
}

interface EditEmployeeForm {
	firstName: string
	lastName: string
	email: string
	phone: string
	departmentId: string
	position: string
}

interface EditEmployeeForm extends Record<string, unknown> {
	firstName: string
	lastName: string
	email: string
	phone: string
	departmentId: string
	position: string
}

export function EditEmployeeModal({
	isOpen,
	onClose,
	employee
}: EditEmployeeModalProps) {
	const t = useTranslations('dashboard.employees.modal.edit')
	const queryClient = useQueryClient()
	const { updateEmployee } = useEmployees()
	const { departments } = useDepartment()

	const handleSubmit = async (data: EditEmployeeForm) => {
		try {
			// Обновляем данные в кэше оптимистично
			queryClient.setQueryData(
				EMPLOYEES_QUERY_KEY,
				(oldData: Employee[] | undefined) => {
					if (!oldData) return []
					return oldData.map(emp =>
						emp.id === employee.id ? { ...emp, ...data } : emp
					)
				}
			)

			// Выполняем обновление
			await updateEmployee({
				id: employee.id,
				data: data
			})

			// После успешного обновления инвалидируем кэш для получения свежих данных
			queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
			toast.success(t('success'))
			onClose()
		} catch (error) {
			console.error('Ошибка при обновлении сотрудника:', error)
			toast.error(t('error'))
			queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
		}
	}

	return (
		<ModalForm<EditEmployeeForm>
			key={`${employee.id}-${isOpen}-${JSON.stringify(employee)}`}
			isOpen={isOpen}
			onClose={onClose}
			title={t('heading')}
			fields={[
				{
					name: 'firstName',
					label: t('nameLabel'),
					placeholder: t('firstNamePlaceholder'),
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
			defaultValues={{
				firstName: employee.firstName,
				lastName: employee.lastName,
				email: employee.email ?? '',
				phone: employee.phone ?? '',
				departmentId: employee.department?.id || '',
				position: employee.position ?? ''
			}}
		/>
	)
}
