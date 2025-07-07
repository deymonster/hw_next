import { Employee } from '@prisma/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
	createEmployee,
	deleteEmployee,
	getEmployees,
	updateEmployee
} from '@/app/actions/employee'
import {
	EmployeeFilterOptions,
	IEmployeeCreateInput
} from '@/services/employee/employee.interfaces'

export const EMPLOYEES_QUERY_KEY = ['employees'] as const

export function useEmployees(options?: EmployeeFilterOptions) {
	const queryClient = useQueryClient()

	const {
		data: employees = [],
		isLoading,
		error
	} = useQuery({
		queryKey: [...EMPLOYEES_QUERY_KEY, options],
		queryFn: () => getEmployees(options)
	})

	const createMutation = useMutation({
		mutationFn: (data: IEmployeeCreateInput) => createEmployee(data),
		onSuccess: () => {
			// Инвалидируем кэш после успешного создания
			queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
		}
	})

	// Обновление сотрудника
	const updateMutation = useMutation({
		mutationFn: ({
			id,
			data
		}: {
			id: string
			data: Partial<IEmployeeCreateInput>
		}) => updateEmployee(id, data),
		onSuccess: updatedEmployee => {
			// Обновляем все связанные запросы
			queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })

			// Обновляем кэш для списка сотрудников
			queryClient.setQueryData(
				EMPLOYEES_QUERY_KEY,
				(oldData: Employee[] | undefined) => {
					if (!oldData) return [updatedEmployee]
					return oldData.map(emp =>
						emp.id === updatedEmployee.id ? updatedEmployee : emp
					)
				}
			)

			// Обновляем кэш для конкретного сотрудника
			queryClient.setQueryData(
				['employee', updatedEmployee.id],
				updatedEmployee
			)
		}
	})

	// Удаление сотрудника
	const deleteMutation = useMutation({
		mutationFn: ({
			id,
			unassignDevices
		}: {
			id: string
			unassignDevices?: boolean
		}) => deleteEmployee(id, unassignDevices),
		onSuccess: (_, { id }) => {
			// Инвалидируем кэш после успешного удаления
			queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
			// Удаляем кэш конкретного сотрудника
			queryClient.removeQueries({
				queryKey: [...EMPLOYEES_QUERY_KEY, id]
			})
		}
	})

	return {
		employees,
		isLoading,
		error,

		createEmployee: createMutation.mutate,
		updateEmployee: updateMutation.mutate,
		deleteEmployee: deleteMutation.mutate,

		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isDeleting: deleteMutation.isPending,

		createError: createMutation.error,
		updateError: updateMutation.error,
		deleteError: deleteMutation.error,
		refetch: () =>
			queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
	}
}
