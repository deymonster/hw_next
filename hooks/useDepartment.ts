/**
 * Хук `useDepartment` управляет загрузкой отделов и их связанных сущностей,
 * предоставляя операции создания, обновления, удаления и обновления состава
 * устройств с использованием React Query.
 */
import { Department, Device } from '@prisma/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
	createDepartment,
	deleteDepartment,
	getDepartmentsWithCounts,
	updateDepartment
} from '@/app/actions/department'
import { IDepartmentCreateInput } from '@/services/department/department.interface'

export type DepartmentWithCounts = Department & {
	deviceCount: number
	employeesCount: number
	employees?: {
		id: string
		firstName: string
		lastName: string
		email: string | null
		phone: string | null
		position: string | null
	}[]
	devices?: (Device & {
		deviceStatus?: {
			isOnline: boolean
			lastSeen: Date | null
		}
	})[]
}

export const DEPARTMENTS_QUERY_KEY = ['departments'] as const

export function useDepartment() {
	const queryClient = useQueryClient()

	const {
		data: departments = [],
		isLoading,
		error
	} = useQuery({
		queryKey: DEPARTMENTS_QUERY_KEY,
		queryFn: async () => {
			return getDepartmentsWithCounts()
		}
	})

	const createMutation = useMutation({
		mutationFn: (data: IDepartmentCreateInput) => createDepartment(data),
		onSuccess: newDepartment => {
			// Инвалидируем кэш после успешного создания
			queryClient.invalidateQueries({ queryKey: DEPARTMENTS_QUERY_KEY })

			// Обновляем кэш для списка отделов
			queryClient.setQueryData(
				DEPARTMENTS_QUERY_KEY,
				(oldData: DepartmentWithCounts[] | undefined) => {
					return [
						...(oldData || []),
						{ ...newDepartment, deviceCount: 0, employeesCount: 0 }
					]
				}
			)
		}
	})

	// Обновление отдела
	const updateMutation = useMutation({
                mutationFn: ({
                        id,
                        data
                }: {
                        id: string
                        data: Partial<IDepartmentCreateInput>
                }) => updateDepartment(id, data),
		onSuccess: updatedDepartment => {
			// Обновляем все связанные запросы
			queryClient.invalidateQueries({ queryKey: DEPARTMENTS_QUERY_KEY })

			// Обновляем кэш для списка отделов
			queryClient.setQueryData(
				DEPARTMENTS_QUERY_KEY,
				(oldData: DepartmentWithCounts[] | undefined) => {
					if (!oldData) return [updatedDepartment]
					return oldData.map(dep =>
						dep.id === updatedDepartment.id
							? updatedDepartment
							: dep
					)
				}
			)

			// Обновляем кэш для конкретного отдела
			queryClient.setQueryData(
				['department', updatedDepartment.id],
				updatedDepartment
			)
		}
	})

	// Удаление отдела
	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteDepartment(id),
		onSuccess: (_, id) => {
			// Инвалидируем кэш после успешного удаления
			queryClient.invalidateQueries({ queryKey: DEPARTMENTS_QUERY_KEY })
			// Удаляем кэш конкретного отдела
			queryClient.removeQueries({
				queryKey: [...DEPARTMENTS_QUERY_KEY, id]
			})
		}
	})

	return {
		departments,
		isLoading,
		error,

		createDepartment: createMutation.mutate,
		updateDepartment: updateMutation.mutate,
		deleteDepartment: deleteMutation.mutate,

		isCreating: createMutation.isPending,
		isUpdating: updateMutation.isPending,
		isDeleting: deleteMutation.isPending,

		createError: createMutation.error,
		updateError: updateMutation.error,
		deleteError: deleteMutation.error,
		refetch: () =>
			queryClient.invalidateQueries({ queryKey: DEPARTMENTS_QUERY_KEY })
	}
}
