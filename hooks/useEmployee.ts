import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    getEmployees, 
    createEmployee, 
    updateEmployee, 
    deleteEmployee 
} from '@/app/actions/employee'
import { EmployeeFilterOptions, IEmployeeCreateInput } from '@/services/employee/employee.interfaces'


export const EMPLOYEES_QUERY_KEY = ['employees'] as const

export function useEmployees(options?: EmployeeFilterOptions) {
    const queryClient = useQueryClient()

    const { data: employees = [], isLoading, error } = useQuery({
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
        mutationFn: ({ id, data }: { id: string; data: Partial<IEmployeeCreateInput> }) => 
            updateEmployee(id, data),
        onSuccess: () => {
            // Инвалидируем кэш после успешного обновления
            queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
        }
    })

    // Удаление сотрудника
    const deleteMutation = useMutation({
        mutationFn: ({ id, unassignDevices }: { id: string; unassignDevices?: boolean }) => 
            deleteEmployee(id, unassignDevices),
        onSuccess: () => {
            // Инвалидируем кэш после успешного удаления
            queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
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
        refetch: () => queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })

    }
}