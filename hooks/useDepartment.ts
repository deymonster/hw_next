import { Department } from '@prisma/client';
import { getDepartments, getDepartmentsWithCounts, createDepartment, updateDepartment, deleteDepartment } from '@/app/actions/department';
import { IDepartmentCreateInput } from '@/services/department/department.interface';
import { useQuery, useQueryClient } from '@tanstack/react-query'

export type DepartmentWithCounts = Department & {
    deviceCount: number;
    employeesCount: number;
}

export function useDepartment() {
    const queryClient = useQueryClient()
    
    const {
        data: departments = [],
        isLoading,
        error,
        refetch: refresh
    } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            return await getDepartmentsWithCounts();
        }
    })

    const handleCreate = async (data: IDepartmentCreateInput ) => {
        try {
            const newDepartment = await createDepartment(data);
            queryClient.setQueryData(['departments'], (old: DepartmentWithCounts[]) => {
                return [...(old || []), { ...newDepartment, deviceCount: 0, employeesCount: 0 }];
            });
            return newDepartment;
        } catch (error: any) {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            throw error;
        }
    }

    const handleUpdate = async (id: string, data: Partial<IDepartmentCreateInput>) => {
        try {
            const updated = await updateDepartment(id, data);
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            return updated;
        } catch (error: any) {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            throw error;
        }
    }

    const handleDelete = async (id: string) => {
        try {
            queryClient.setQueryData(['departments'], (old: DepartmentWithCounts[]) => {
                return (old || []).filter(dep => dep.id !== id);
            });
            await deleteDepartment(id);
        } catch (error: any) {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            throw error;
        }
    }
    return {
        departments,
        loading: isLoading,
        error,
        refresh,
        create: handleCreate,
        update: handleUpdate,
        delete: handleDelete,
    }
    
}